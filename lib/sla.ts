import type { Prisma } from "@prisma/client";
import { CLOSED_STATUSES, PRIORITIES, type Priority, type Status } from "@/lib/constants";

// Service-level agreements: each priority can have a response target (time
// until the team acknowledges the issue) and a resolution target (time until
// it's done). Clocks run on wall-clock time from creation. Pure functions only;
// the alerting sweep lives in lib/sla-sweep.ts.

export type Target = { respond: number | null; resolve: number | null };
/** Minutes per priority. A missing priority has no SLA. */
export type SlaTargets = Partial<Record<Priority, Target>>;

export type ClockState = "on_track" | "at_risk" | "breached" | "met";

export type Clock = {
  state: ClockState;
  dueAt: Date;
  /** When the clock stopped (responded / resolved), if it has. */
  stoppedAt: Date | null;
  /** Time left for a running clock; negative once overdue. */
  remainingMs: number | null;
};

export type SlaStatus = {
  respond: Clock | null;
  resolve: Clock | null;
  /** Worst state across both clocks, including targets already met or missed. */
  worst: ClockState | null;
  /** Worst state of clocks still running: what needs attention now. */
  live: ClockState | null;
};

/** A running clock is "at risk" in the last quarter of its window. */
export const AT_RISK_FRACTION = 0.25;

const MINUTE = 60_000;

export const DEFAULT_TARGETS: Record<Priority, Target> = {
  URGENT: { respond: 60, resolve: 8 * 60 },
  HIGH: { respond: 4 * 60, resolve: 24 * 60 },
  MEDIUM: { respond: 24 * 60, resolve: 3 * 24 * 60 },
  LOW: { respond: 3 * 24 * 60, resolve: 14 * 24 * 60 },
  NONE: { respond: null, resolve: null },
};

const SEVERITY: Record<ClockState, number> = { met: 0, on_track: 1, at_risk: 2, breached: 3 };

export function worstOf(states: (ClockState | null | undefined)[]): ClockState | null {
  let worst: ClockState | null = null;
  for (const s of states) if (s && (!worst || SEVERITY[s] > SEVERITY[worst])) worst = s;
  return worst;
}

export function evaluateClock(start: Date, minutes: number, stoppedAt: Date | null, now: Date): Clock {
  const windowMs = minutes * MINUTE;
  const dueAt = new Date(start.getTime() + windowMs);
  if (stoppedAt) {
    return { state: stoppedAt <= dueAt ? "met" : "breached", dueAt, stoppedAt, remainingMs: null };
  }
  const remainingMs = dueAt.getTime() - now.getTime();
  const state: ClockState = remainingMs < 0 ? "breached" : remainingMs <= windowMs * AT_RISK_FRACTION ? "at_risk" : "on_track";
  return { state, dueAt, stoppedAt: null, remainingMs };
}

type SlaIssue = {
  priority: string;
  status: string;
  createdAt: Date;
  firstResponseAt: Date | null;
  closedAt: Date | null;
};

/** Both clocks for an issue. Canceled issues and priorities without targets have none. */
export function evaluateSla(issue: SlaIssue, targets: SlaTargets, now = new Date()): SlaStatus {
  const target = targets[issue.priority as Priority];
  if (!target || issue.status === "CANCELED") return { respond: null, resolve: null, worst: null, live: null };

  const closed = CLOSED_STATUSES.includes(issue.status as Status);
  // A resolved issue counts as responded to, at the latest when it closed.
  const responded = issue.firstResponseAt ?? (closed ? issue.closedAt : null);
  const respond = target.respond ? evaluateClock(issue.createdAt, target.respond, responded, now) : null;
  const resolve = target.resolve ? evaluateClock(issue.createdAt, target.resolve, closed ? issue.closedAt : null, now) : null;
  const running = [respond, resolve].filter((c) => c && !c.stoppedAt).map((c) => c!.state);
  return { respond, resolve, worst: worstOf([respond?.state, resolve?.state]), live: worstOf(running) };
}

/** True when this transition counts as the team's first response. */
export function isResponse({ fromStatus, toStatus }: { fromStatus: string; toStatus?: string }) {
  const waiting = (s: string) => s === "BACKLOG" || s === "TODO";
  return Boolean(toStatus && waiting(fromStatus) && !waiting(toStatus));
}

export function formatDuration(ms: number) {
  const abs = Math.abs(ms);
  if (abs < 60 * MINUTE) return `${Math.max(1, Math.round(abs / MINUTE))}m`;
  if (abs < 48 * 60 * MINUTE) return `${Math.round(abs / (60 * MINUTE))}h`;
  return `${Math.round(abs / (24 * 60 * MINUTE))}d`;
}

/** Short human label for a clock: "3h left", "2d overdue", "met", "missed by 4h". */
export function describeClock(clock: Clock) {
  if (clock.stoppedAt) {
    const delta = clock.stoppedAt.getTime() - clock.dueAt.getTime();
    return clock.state === "met" ? "met" : `missed by ${formatDuration(delta)}`;
  }
  const ms = clock.remainingMs ?? 0;
  return ms < 0 ? `${formatDuration(ms)} overdue` : `${formatDuration(ms)} left`;
}

/**
 * Prisma filter for open issues whose response or resolution clock is
 * currently at risk or breached. Built per priority, since each has its own window.
 */
export function slaWhere(targets: SlaTargets, state: "at_risk" | "breached", now = new Date()): Prisma.IssueWhereInput {
  const clauses: Prisma.IssueWhereInput[] = [];
  for (const priority of PRIORITIES) {
    const t = targets[priority];
    if (!t) continue;
    for (const [minutes, extra] of [
      [t.resolve, {}],
      [t.respond, { firstResponseAt: null }],
    ] as const) {
      if (!minutes) continue;
      const windowMs = minutes * MINUTE;
      const dueBefore = new Date(now.getTime() - windowMs); // created before this ⇒ overdue
      const riskFrom = new Date(now.getTime() - windowMs * (1 - AT_RISK_FRACTION));
      clauses.push({
        priority,
        ...extra,
        createdAt: state === "breached" ? { lt: dueBefore } : { gte: dueBefore, lte: riskFrom },
      });
    }
  }
  if (clauses.length === 0) return { id: { in: [] } };
  return { status: { notIn: [...CLOSED_STATUSES] }, OR: clauses };
}

/** Share of closed clocks that met their target, or null when there are none. */
export function hitRate(clocks: (Clock | null)[]) {
  const done = clocks.filter((c): c is Clock => Boolean(c?.stoppedAt));
  if (done.length === 0) return null;
  return done.filter((c) => c.state === "met").length / done.length;
}

/** Targets map from database rows. */
export function targetsFromRows(rows: { priority: string; respondMinutes: number | null; resolveMinutes: number | null }[]): SlaTargets {
  const out: SlaTargets = {};
  for (const r of rows) {
    if (r.respondMinutes || r.resolveMinutes) out[r.priority as Priority] = { respond: r.respondMinutes, resolve: r.resolveMinutes };
  }
  return out;
}
