// Demo data for local development: `npm run db:seed`.
// Re-running replaces the demo users and projects; nothing else is touched.
//
// Demo accounts (local test data only):
//   ada@demo.test    / demo-password-1   (owner)
//   linus@demo.test  / demo-password-1   (member)
//   grace@demo.test  / demo-password-1   (viewer on PAY)

import "dotenv/config";
import bcrypt from "bcryptjs";
import pg from "pg";
import { PrismaClient, type IssuePriority, type IssueStatus, type IssueType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEFAULT_TARGETS, evaluateSla, targetsFromRows } from "../lib/sla";

const prisma = new PrismaClient({ adapter: new PrismaPg(new pg.Pool({ connectionString: process.env.DATABASE_URL })) });

const DAY = 86_400_000;
const PASSWORD = "demo-password-1";
const DEMO_EMAILS = ["ada@demo.test", "linus@demo.test", "grace@demo.test"];
const DEMO_KEYS = ["WEB", "PAY"];

// Deterministic pseudo-random so the demo looks the same every run.
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];

const WEB_ISSUES: [string, IssueType][] = [
  ["Login form loses focus after failed attempt", "BUG"],
  ["Dark mode: chart tooltips unreadable", "BUG"],
  ["Add keyboard shortcuts cheat sheet", "FEATURE"],
  ["Migrate settings page to new design system", "TASK"],
  ["Image uploads fail above 8 MB", "BUG"],
  ["Offline banner when the network drops", "FEATURE"],
  ["Audit bundle size of the dashboard route", "TASK"],
  ["Search results flicker while typing", "BUG"],
  ["Export filtered list as CSV", "FEATURE"],
  ["Safari: sticky header overlaps modal", "BUG"],
  ["Write e2e tests for onboarding", "TASK"],
  ["Command palette fuzzy matching", "FEATURE"],
  ["Avatar initials wrong for single-word names", "BUG"],
  ["Lazy-load the markdown preview", "TASK"],
];

const PAY_ISSUES: [string, IssueType][] = [
  ["Webhook retries are not idempotent", "BUG"],
  ["Card declined errors show raw provider codes", "BUG"],
  ["Support partial refunds", "FEATURE"],
  ["Payment provider outage on 2026-10-14", "INCIDENT"],
  ["Rotate signing secrets quarterly", "TASK"],
  ["Currency rounding off by one cent for JPY", "BUG"],
  ["Add idempotency keys to POST /charges", "FEATURE"],
  ["Reconcile ledger nightly job", "TASK"],
  ["3-D Secure challenge fails on mobile Safari", "BUG"],
  ["Document the refund state machine", "TASK"],
];

const DESCRIPTION = `## Context

Reported by a customer through support. Reproduces on the latest build.

## Steps to reproduce
1. Open the page
2. Trigger the action twice quickly
3. Observe the result

## Expected
The action completes once and the UI stays responsive.

- [x] Reproduced locally
- [ ] Root cause identified`;

async function main() {
  await prisma.project.deleteMany({ where: { key: { in: DEMO_KEYS } } });
  await prisma.user.deleteMany({ where: { email: { in: DEMO_EMAILS } } });

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const [ada, linus, grace] = await Promise.all(
    [["Ada Lovelace", DEMO_EMAILS[0]], ["Linus Torvalds", DEMO_EMAILS[1]], ["Grace Hopper", DEMO_EMAILS[2]]].map(([name, email]) =>
      prisma.user.create({ data: { name, email, passwordHash, emailVerified: new Date() } }),
    ),
  );

  const now = Date.now();
  const statuses: IssueStatus[] = ["BACKLOG", "TODO", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "DONE", "DONE", "CANCELED"];
  const priorities: IssuePriority[] = ["NONE", "LOW", "MEDIUM", "MEDIUM", "HIGH", "URGENT"];

  for (const [key, name, color, description, titles, members] of [
    ["WEB", "Web App", "#6366f1", "Customer-facing web application.", WEB_ISSUES, [[ada, "OWNER"], [linus, "MEMBER"]]],
    ["PAY", "Payments API", "#14b8a6", "Charges, refunds and webhooks.", PAY_ISSUES, [[ada, "OWNER"], [linus, "ADMIN"], [grace, "VIEWER"]]],
  ] as const) {
    const project = await prisma.project.create({
      data: {
        key, name, color, description,
        // Soft WIP limit low enough that the demo board shows a full column.
        wipLimits: key === "WEB" ? { IN_PROGRESS: 2, IN_REVIEW: 3 } : { IN_PROGRESS: 4 },
        slaTargets: {
          create: (Object.keys(DEFAULT_TARGETS) as IssuePriority[])
            .filter((p) => DEFAULT_TARGETS[p].resolve)
            .map((priority) => ({ priority, respondMinutes: DEFAULT_TARGETS[priority].respond, resolveMinutes: DEFAULT_TARGETS[priority].resolve })),
        },
        members: { create: members.map(([u, role]) => ({ userId: u.id, role })) },
        labels: {
          create: [
            { name: "frontend", color: "#06b6d4" },
            { name: "backend", color: "#8b5cf6" },
            { name: "infra", color: "#f97316" },
            { name: "regression", color: "#ef4444" },
          ],
        },
      },
      include: { labels: true },
    });
    const assignable = members.filter(([, role]) => role !== "VIEWER").map(([u]) => u);

    let number = 0;
    for (const [title, type] of titles) {
      number++;
      const status = pick(statuses);
      // Open work is recent, so SLA clocks show a realistic mix; finished work spans four weeks.
      const isOpen = status !== "DONE" && status !== "CANCELED";
      const createdAt = new Date(isOpen ? now - Math.floor((0.1 + rand() * 2.4) * DAY) : now - Math.floor(rand() * 28 * DAY) - DAY);
      const closedAt = status === "DONE" || status === "CANCELED" ? new Date(Math.min(now, createdAt.getTime() + Math.floor((0.2 + rand() * 4) * DAY))) : null;
      const reporter = pick(assignable);
      const assignee = rand() < 0.8 ? pick(assignable) : null;
      const dueDate = rand() < 0.45 ? new Date(Math.floor((now + (rand() * 14 - 4) * DAY) / DAY) * DAY) : null;

      const issue = await prisma.issue.create({
        data: {
          projectId: project.id,
          number,
          title,
          type,
          status,
          priority: type === "INCIDENT" ? "URGENT" : pick(priorities),
          description: rand() < 0.7 ? DESCRIPTION : "",
          position: number * 1024,
          reporterId: reporter.id,
          assigneeId: assignee?.id ?? null,
          dueDate,
          estimate: rand() < 0.75 ? pick([1, 2, 3, 5, 8]) : null,
          firstResponseAt: (status === "BACKLOG" || status === "TODO") && rand() < 0.5 ? null : new Date(Math.min(now, createdAt.getTime() + Math.floor(rand() * 3 * 3_600_000))),
          createdAt,
          closedAt,
          labels: { connect: [pick(project.labels), ...(rand() < 0.3 ? [pick(project.labels)] : [])].map((l) => ({ id: l.id })) },
          activities: {
            create: [
              { kind: "CREATED", actorId: reporter.id, createdAt },
              ...(status !== "BACKLOG" && status !== "TODO"
                ? [{ kind: "FIELD_CHANGED" as const, field: "status", fromValue: "TODO", toValue: status, actorId: assignee?.id ?? reporter.id, createdAt: closedAt ?? new Date(createdAt.getTime() + DAY / 2) }]
                : []),
            ],
          },
        },
      });

      if (rand() < 0.5) {
        const author = pick(assignable);
        const at = new Date(createdAt.getTime() + DAY / 3);
        await prisma.comment.create({
          data: { issueId: issue.id, authorId: author.id, createdAt: at, updatedAt: at, body: pick([
            "I can reproduce this on staging. Looking into it now.",
            "Could this be related to the caching change last week? @ada",
            "Pushed a fix behind a flag, needs review.\n\n```ts\nif (!session) return redirect('/login');\n```",
            "Lowering priority, the workaround is documented in the runbook.",
          ]) },
        });
        await prisma.activity.create({ data: { issueId: issue.id, actorId: author.id, kind: "COMMENTED", createdAt: at } });
      }
    }

    if (key === "WEB") {
      // A parent with sub-issues, so the breakdown and progress bar have something to show.
      const parent = await prisma.issue.findFirstOrThrow({ where: { projectId: project.id, number: 4 } });
      const steps: [string, IssueStatus][] = [
        ["Port buttons and inputs to new tokens", "DONE"],
        ["Rebuild the settings navigation", "IN_PROGRESS"],
        ["Dark mode pass on settings", "TODO"],
      ];
      for (const [title, status] of steps) {
        number++;
        const createdAt = new Date(now - 3 * DAY);
        await prisma.issue.create({
          data: {
            projectId: project.id, number, title, status, type: "TASK", priority: "MEDIUM",
            parentId: parent.id, reporterId: ada.id, assigneeId: pick(assignable).id,
            position: number * 1024, createdAt, closedAt: status === "DONE" ? new Date(now - DAY) : null,
            activities: { create: [{ kind: "CREATED", actorId: ada.id, createdAt }] },
          },
        });
      }
    }

    if (key === "PAY") {
      // An error reported through the ingestion API that keeps recurring.
      number++;
      await prisma.issue.create({
        data: {
          projectId: project.id,
          number,
          title: "TimeoutError: provider did not respond within # ms",
          type: "BUG",
          status: "TODO",
          priority: "HIGH",
          source: "API",
          fingerprint: "seed-provider-timeout",
          occurrences: 47,
          environment: "production",
          lastSeenAt: new Date(now - 2 * 3_600_000),
          position: -1024,
          createdAt: new Date(now - 6 * DAY),
          description: "Charge request to the payment provider timed out.\n\n**Level:** error · **Environment:** production\n\n### Stack trace\n\n```\nTimeoutError: provider did not respond within 10000 ms\n    at charge (src/providers/stripe.ts:88:11)\n    at POST /charges (src/routes/charges.ts:31:5)\n```\n\n_Reported automatically through the ingestion API._",
          activities: { create: [{ kind: "CREATED", createdAt: new Date(now - 6 * DAY) }] },
        },
      });
    }

    // Ten weeks of finished work so the velocity chart has history.
    const CHORES = ["Tidy error messages", "Upgrade dependencies", "Improve test coverage", "Refactor data layer", "Fix flaky test", "Polish empty states", "Add audit logging", "Speed up slow query", "Update API docs", "Clean up feature flags"];
    for (let week = 1; week <= 10; week++) {
      const perWeek = 2 + Math.floor(rand() * 3);
      for (let k = 0; k < perWeek; k++) {
        number++;
        const closedAt = new Date(now - week * 7 * DAY + Math.floor(rand() * 5) * DAY);
        const createdAt = new Date(closedAt.getTime() - Math.floor((0.5 + rand() * 4) * DAY));
        await prisma.issue.create({
          data: {
            projectId: project.id, number, title: `${pick(CHORES)} (${key.toLowerCase()}-${week}${k})`,
            type: "TASK", status: "DONE", priority: pick(priorities), estimate: rand() < 0.85 ? pick([1, 2, 3, 5, 8]) : null,
            reporterId: pick(assignable).id, assigneeId: pick(assignable).id, position: number * 1024,
            createdAt, closedAt, firstResponseAt: new Date(createdAt.getTime() + 2 * 3_600_000),
            activities: { create: [{ kind: "CREATED", createdAt }] },
          },
        });
      }
    }

    // Fresh urgent and high issues so the SLA views have something at risk and breached.
    for (const [title, priority, hoursAgo] of [
      [`${name}: login requests timing out for some users`, "URGENT", 7],
      [`${name}: export job stuck in queue`, "HIGH", 30],
    ] as const) {
      number++;
      const createdAt = new Date(now - hoursAgo * 3_600_000);
      await prisma.issue.create({
        data: {
          projectId: project.id, number, title, type: "INCIDENT", status: "TODO", priority,
          reporterId: pick(assignable).id, assigneeId: ada.id, position: -number * 1024, createdAt,
          activities: { create: [{ kind: "CREATED", createdAt }] },
        },
      });
    }

    await prisma.project.update({ where: { id: project.id }, data: { issueCounter: number } });
  }

  // Mark SLA state as already known, so the first sweep only alerts on new changes
  // (mirrors baselineSlaAlerts in lib/sla-sweep.ts, which is server-only).
  for (const project of await prisma.project.findMany({ where: { key: { in: DEMO_KEYS } }, include: { slaTargets: true } })) {
    const targets = targetsFromRows(project.slaTargets);
    const open = await prisma.issue.findMany({ where: { projectId: project.id, closedAt: null } });
    for (const issue of open) {
      const { live: worst } = evaluateSla(issue, targets);
      const level = worst === "breached" ? 2 : worst === "at_risk" ? 1 : 0;
      if (level) await prisma.issue.update({ where: { id: issue.id }, data: { slaAlert: level } });
    }
  }

  // A few unread notifications so the inbox has something in it.
  const someIssues = await prisma.issue.findMany({ where: { assigneeId: ada.id }, take: 3 });
  await prisma.notification.createMany({
    data: someIssues.map((i, idx) => ({ userId: ada.id, actorId: linus.id, issueId: i.id, type: (["ASSIGNED", "MENTIONED", "COMMENTED"] as const)[idx % 3] })),
  });

  console.log(`Seeded ${DEMO_KEYS.join(", ")} with demo users (see prisma/seed.ts for sign-in details).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
