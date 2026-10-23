// Weekly velocity: estimate points completed per calendar week (Monday-start,
// UTC). No sprints required; a rolling average of recent full weeks drives a
// simple backlog forecast.

const DAY = 86_400_000;

export type VelocityIssue = { status: string; closedAt: Date | null; estimate: number | null };

export type WeekPoint = {
  /** ISO date of the week's Monday. */
  weekStart: string;
  points: number;
  issues: number;
  /** Done issues with no estimate (not counted in points). */
  unestimated: number;
  /** True for the week containing `now`, which is still in progress. */
  partial: boolean;
};

/** Monday 00:00 UTC of the week containing `d`. */
export function startOfWeek(d: Date) {
  const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const weekday = (new Date(day).getUTCDay() + 6) % 7; // Monday = 0
  return new Date(day - weekday * DAY);
}

/** The last `weeks` weeks (oldest first, current week last). */
export function weeklyVelocity(issues: VelocityIssue[], weeks = 12, now = new Date()): WeekPoint[] {
  const current = startOfWeek(now).getTime();
  const first = current - (weeks - 1) * 7 * DAY;
  const out: WeekPoint[] = Array.from({ length: weeks }, (_, i) => ({
    weekStart: new Date(first + i * 7 * DAY).toISOString().slice(0, 10),
    points: 0,
    issues: 0,
    unestimated: 0,
    partial: i === weeks - 1,
  }));
  for (const issue of issues) {
    if (issue.status !== "DONE" || !issue.closedAt) continue;
    const idx = Math.floor((startOfWeek(issue.closedAt).getTime() - first) / (7 * DAY));
    if (idx < 0 || idx >= weeks) continue;
    out[idx].issues++;
    if (issue.estimate === null) out[idx].unestimated++;
    else out[idx].points += issue.estimate;
  }
  return out;
}

/** Mean points over the last `n` complete weeks; null with no complete weeks. */
export function averageVelocity(points: WeekPoint[], n = 4) {
  const complete = points.filter((p) => !p.partial).slice(-n);
  if (complete.length === 0) return null;
  return complete.reduce((s, p) => s + p.points, 0) / complete.length;
}

/** Weeks needed to finish `openPoints` at `average` points/week. */
export function forecastWeeks(openPoints: number, average: number | null) {
  if (!average || average <= 0) return null;
  return Math.ceil((openPoints / average) * 10) / 10;
}
