import type { Prisma } from "@prisma/client";
import { PRIORITIES, STATUSES, TYPES, type IssueKind, type Priority, type Status } from "@/lib/constants";

// URL ⇄ filter state ⇄ Prisma `where`. The list view keeps all of its state
// in the query string so filtered views can be bookmarked and shared.

export const SORTS = ["updated", "created", "priority", "due", "number"] as const;
export type Sort = (typeof SORTS)[number];

export const PAGE_SIZE = 25;

export type IssueFilters = {
  q: string;
  status: Status[];
  priority: Priority[];
  type: IssueKind[];
  /** "me", "none", or a user id. */
  assignee: string | null;
  label: string | null;
  sort: Sort;
  page: number;
};

type Params = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function list<T extends string>(v: string | string[] | undefined, allowed: readonly T[]): T[] {
  const raw = Array.isArray(v) ? v.join(",") : (v ?? "");
  const out = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is T => (allowed as readonly string[]).includes(s));
  return [...new Set(out)];
}

export function parseFilters(params: Params): IssueFilters {
  const sort = first(params.sort);
  const page = Number.parseInt(first(params.page) ?? "1", 10);
  return {
    q: (first(params.q) ?? "").trim().slice(0, 200),
    status: list(params.status, STATUSES),
    priority: list(params.priority, PRIORITIES),
    type: list(params.type, TYPES),
    assignee: first(params.assignee) || null,
    label: first(params.label) || null,
    sort: (SORTS as readonly string[]).includes(sort ?? "") ? (sort as Sort) : "updated",
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1,
  };
}

/** Query string for `filters` with `patch` applied; page resets unless patched. */
export function filtersToQuery(filters: IssueFilters, patch: Partial<IssueFilters> = {}) {
  const next = { ...filters, page: 1, ...patch };
  const sp = new URLSearchParams();
  if (next.q) sp.set("q", next.q);
  if (next.status.length) sp.set("status", next.status.join(","));
  if (next.priority.length) sp.set("priority", next.priority.join(","));
  if (next.type.length) sp.set("type", next.type.join(","));
  if (next.assignee) sp.set("assignee", next.assignee);
  if (next.label) sp.set("label", next.label);
  if (next.sort !== "updated") sp.set("sort", next.sort);
  if (next.page > 1) sp.set("page", String(next.page));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function hasActiveFilters(f: IssueFilters) {
  return Boolean(f.q || f.status.length || f.priority.length || f.type.length || f.assignee || f.label);
}

/** Matches "API-42" style keys so a search can jump straight to an issue. */
export function parseIssueKey(q: string) {
  const m = /^([A-Za-z][A-Za-z0-9]{1,5})-(\d{1,9})$/.exec(q.trim());
  return m ? { key: m[1].toUpperCase(), number: Number(m[2]) } : null;
}

export function buildWhere(projectId: string, f: IssueFilters, currentUserId: string): Prisma.IssueWhereInput {
  const where: Prisma.IssueWhereInput = { projectId };
  if (f.status.length) where.status = { in: f.status };
  if (f.priority.length) where.priority = { in: f.priority };
  if (f.type.length) where.type = { in: f.type };
  if (f.assignee === "me") where.assigneeId = currentUserId;
  else if (f.assignee === "none") where.assigneeId = null;
  else if (f.assignee) where.assigneeId = f.assignee;
  if (f.label) where.labels = { some: { id: f.label } };
  if (f.q) {
    const asNumber = /^\d+$/.test(f.q) ? Number(f.q) : null;
    const key = parseIssueKey(f.q);
    where.OR = [
      { title: { contains: f.q, mode: "insensitive" } },
      { description: { contains: f.q, mode: "insensitive" } },
      ...(asNumber !== null ? [{ number: asNumber }] : []),
      ...(key ? [{ number: key.number }] : []),
    ];
  }
  return where;
}

export function buildOrderBy(sort: Sort): Prisma.IssueOrderByWithRelationInput[] {
  switch (sort) {
    case "created":
      return [{ createdAt: "desc" }];
    case "priority":
      // Enum order is NONE < LOW < … < URGENT, so desc puts urgent first.
      return [{ priority: "desc" }, { updatedAt: "desc" }];
    case "due":
      return [{ dueDate: { sort: "asc", nulls: "last" } }, { priority: "desc" }];
    case "number":
      return [{ number: "desc" }];
    default:
      return [{ updatedAt: "desc" }];
  }
}
