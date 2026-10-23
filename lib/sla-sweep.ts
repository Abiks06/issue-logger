import "server-only";
import { prisma } from "@/lib/db";
import { OPEN_STATUSES } from "@/lib/constants";
import { evaluateSla, targetsFromRows } from "@/lib/sla";
import { emitWebhookEvent, runOutbox } from "@/lib/outbox";

// Sends "SLA at risk" / "SLA breached" notifications. Runs from the cron
// endpoint (app/api/cron/sla) and opportunistically after page renders, at
// most once a minute per server process. Issue.slaAlert records the highest
// alert sent so each level fires once.

const MIN_INTERVAL_MS = 60_000;
let lastRun = 0;
let running = false;

export async function maybeSweepSla() {
  const now = Date.now();
  if (running || now - lastRun < MIN_INTERVAL_MS) return;
  lastRun = now;
  running = true;
  try {
    await sweepSla();
    // Backstop for anything a request's after() didn't get to (e.g. retries).
    await runOutbox();
  } catch (err) {
    console.error("SLA sweep failed", err);
  } finally {
    running = false;
  }
}

export async function sweepSla(now = new Date()) {
  const projects = await prisma.project.findMany({
    where: { slaTargets: { some: {} } },
    select: {
      id: true,
      slaTargets: true,
      members: { where: { role: { in: ["OWNER", "ADMIN"] } }, select: { userId: true } },
    },
  });

  let sent = 0;
  for (const project of projects) {
    const targets = targetsFromRows(project.slaTargets);
    const issues = await prisma.issue.findMany({
      where: { projectId: project.id, status: { in: [...OPEN_STATUSES] }, slaAlert: { lt: 2 } },
      select: { id: true, priority: true, status: true, createdAt: true, firstResponseAt: true, closedAt: true, slaAlert: true, assigneeId: true },
      take: 5000,
    });

    for (const issue of issues) {
      const { live: worst } = evaluateSla(issue, targets, now);
      const level = worst === "breached" ? 2 : worst === "at_risk" ? 1 : 0;
      if (level <= issue.slaAlert) continue;

      // Unassigned work alerts the people who can triage it.
      const recipients = issue.assigneeId ? [issue.assigneeId] : project.members.map((m) => m.userId);
      await prisma.$transaction(async (tx) => {
        await tx.issue.update({ where: { id: issue.id }, data: { slaAlert: level } });
        await tx.notification.createMany({
          data: recipients.map((userId) => ({ userId, issueId: issue.id, type: level === 2 ? "SLA_BREACHED" : "SLA_AT_RISK" })),
        });
        if (level === 2) await emitWebhookEvent(tx, { projectId: project.id, event: "sla.breached", issueId: issue.id });
      });
      sent += recipients.length;
    }
  }
  return { projects: projects.length, sent };
}

/**
 * Records each open issue's current SLA level without notifying anyone. Run
 * when targets change, so only issues that cross into "at risk" or "breached"
 * afterwards alert, instead of the whole existing backlog at once.
 */
export async function baselineSlaAlerts(projectId: string, now = new Date()) {
  const [rows, issues] = await Promise.all([
    prisma.slaTarget.findMany({ where: { projectId } }),
    prisma.issue.findMany({
      where: { projectId, status: { in: [...OPEN_STATUSES] } },
      select: { id: true, priority: true, status: true, createdAt: true, firstResponseAt: true, closedAt: true, slaAlert: true },
    }),
  ]);
  const targets = targetsFromRows(rows);
  const byLevel = new Map<number, string[]>();
  for (const issue of issues) {
    const { live: worst } = evaluateSla(issue, targets, now);
    const level = worst === "breached" ? 2 : worst === "at_risk" ? 1 : 0;
    if (level !== issue.slaAlert) byLevel.set(level, [...(byLevel.get(level) ?? []), issue.id]);
  }
  for (const [level, ids] of byLevel) {
    await prisma.issue.updateMany({ where: { id: { in: ids } }, data: { slaAlert: level } });
  }
}
