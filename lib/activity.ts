import { handleFor } from "@/lib/constants";

// Pure helpers for the issue timeline and @mentions.

export type TrackedField = "title" | "description" | "status" | "priority" | "type" | "assignee" | "dueDate" | "estimate" | "labels" | "parent";

type Snapshot = {
  title: string;
  description: string;
  status: string;
  priority: string;
  type: string;
  assigneeId: string | null;
  parentId?: string | null;
  dueDate: Date | null;
  estimate: number | null;
  labelIds: string[];
};

export type FieldChange = { field: TrackedField; from: string | null; to: string | null };

function dateValue(d: Date | null) {
  return d ? d.toISOString().slice(0, 10) : null;
}

/**
 * Field-level diff between two issue snapshots. `next` only carries the
 * fields being updated; missing keys mean "unchanged". Label ids are compared
 * as sets. Description changes are recorded without their (possibly huge) text.
 */
export function diffIssue(prev: Snapshot, next: Partial<Snapshot>): FieldChange[] {
  const changes: FieldChange[] = [];
  const push = (field: TrackedField, from: string | null, to: string | null) => {
    if (from !== to) changes.push({ field, from, to });
  };

  if (next.title !== undefined) push("title", prev.title, next.title);
  if (next.description !== undefined && next.description !== prev.description) {
    changes.push({ field: "description", from: null, to: null });
  }
  if (next.status !== undefined) push("status", prev.status, next.status);
  if (next.priority !== undefined) push("priority", prev.priority, next.priority);
  if (next.type !== undefined) push("type", prev.type, next.type);
  if (next.assigneeId !== undefined) push("assignee", prev.assigneeId, next.assigneeId);
  if (next.parentId !== undefined) push("parent", prev.parentId ?? null, next.parentId);
  if (next.dueDate !== undefined) push("dueDate", dateValue(prev.dueDate), dateValue(next.dueDate));
  if (next.estimate !== undefined) {
    push("estimate", prev.estimate?.toString() ?? null, next.estimate?.toString() ?? null);
  }
  if (next.labelIds !== undefined) {
    const a = [...prev.labelIds].sort().join(",");
    const b = [...next.labelIds].sort().join(",");
    push("labels", a || null, b || null);
  }
  return changes;
}

/** Handles mentioned as @handle in Markdown text (ignores emails and code spans). */
export function extractMentions(text: string) {
  const withoutCode = text.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "");
  const handles = new Set<string>();
  for (const m of withoutCode.matchAll(/(^|[^\w.@])@([a-zA-Z0-9][\w.+-]{0,63})/g)) {
    handles.add(m[2].toLowerCase().replace(/[.]+$/, ""));
  }
  return [...handles];
}

/** Members whose handle appears in `handles`. */
export function resolveMentions<T extends { email: string }>(handles: string[], members: T[]) {
  const wanted = new Set(handles);
  return members.filter((m) => wanted.has(handleFor(m.email)));
}
