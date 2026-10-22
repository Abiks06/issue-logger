// Pure aggregation for the insights pages. Inputs are lightweight issue rows
// so the same functions serve project-level and cross-project views.

export type IssueFact = {
  createdAt: Date;
  closedAt: Date | null;
  status: string;
  priority: string;
  assigneeId: string | null;
  dueDate: Date | null;
};

const DAY = 86_400_000;

/** The moment `days` days before now. */
export function daysAgo(days: number) {
  return new Date(Date.now() - days * DAY);
}

/** UTC midnight of `d`. */
export function startOfDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export type DayPoint = { date: string; created: number; resolved: number };

/** Created vs resolved counts for each of the last `days` days, oldest first. */
export function throughput(issues: IssueFact[], days: number, now = new Date()): DayPoint[] {
  const end = startOfDay(now).getTime();
  const start = end - (days - 1) * DAY;
  const points: DayPoint[] = Array.from({ length: days }, (_, i) => ({
    date: new Date(start + i * DAY).toISOString().slice(0, 10),
    created: 0,
    resolved: 0,
  }));
  const bucket = (d: Date) => Math.floor((startOfDay(d).getTime() - start) / DAY);

  for (const issue of issues) {
    const c = bucket(issue.createdAt);
    if (c >= 0 && c < days) points[c].created++;
    if (issue.closedAt) {
      const r = bucket(issue.closedAt);
      if (r >= 0 && r < days) points[r].resolved++;
    }
  }
  return points;
}

export function median(values: number[]) {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Median hours from creation to resolution, over issues closed in the window. */
export function medianResolutionHours(issues: IssueFact[], sinceDays: number, now = new Date()) {
  const since = now.getTime() - sinceDays * DAY;
  const durations = issues
    .filter((i) => i.closedAt && i.closedAt.getTime() >= since)
    .map((i) => (i.closedAt!.getTime() - i.createdAt.getTime()) / 3_600_000);
  return median(durations);
}

export function countBy<T, K extends string>(items: T[], key: (item: T) => K | null) {
  const out = new Map<K, number>();
  for (const item of items) {
    const k = key(item);
    if (k === null) continue;
    out.set(k, (out.get(k) ?? 0) + 1);
  }
  return out;
}

export function isOverdue(issue: Pick<IssueFact, "dueDate" | "closedAt">, now = new Date()) {
  return Boolean(issue.dueDate && !issue.closedAt && issue.dueDate.getTime() < startOfDay(now).getTime());
}

export function formatDuration(hours: number | null) {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}
