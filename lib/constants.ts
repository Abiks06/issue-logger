// Display metadata shared by server and client code. Keep this file free of
// runtime Prisma imports so it can ship to the browser.

export const STATUSES = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELED"] as const;
export const PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW", "NONE"] as const;
export const TYPES = ["BUG", "FEATURE", "TASK", "INCIDENT"] as const;
export const ROLES = ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const;

export type Status = (typeof STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type IssueKind = (typeof TYPES)[number];
export type Role = (typeof ROLES)[number];

/** Statuses that count as "resolved" for analytics and closedAt. */
export const CLOSED_STATUSES: readonly Status[] = ["DONE", "CANCELED"];
export const OPEN_STATUSES: readonly Status[] = STATUSES.filter((s) => !CLOSED_STATUSES.includes(s));

export const STATUS_META: Record<Status, { label: string; color: string }> = {
  BACKLOG: { label: "Backlog", color: "#94a3b8" },
  TODO: { label: "Todo", color: "#64748b" },
  IN_PROGRESS: { label: "In progress", color: "#f59e0b" },
  IN_REVIEW: { label: "In review", color: "#8b5cf6" },
  DONE: { label: "Done", color: "#10b981" },
  CANCELED: { label: "Canceled", color: "#a1a1aa" },
};

export const PRIORITY_META: Record<Priority, { label: string; color: string; rank: number }> = {
  URGENT: { label: "Urgent", color: "#ef4444", rank: 4 },
  HIGH: { label: "High", color: "#f97316", rank: 3 },
  MEDIUM: { label: "Medium", color: "#eab308", rank: 2 },
  LOW: { label: "Low", color: "#3b82f6", rank: 1 },
  NONE: { label: "No priority", color: "#a1a1aa", rank: 0 },
};

export const TYPE_META: Record<IssueKind, { label: string; color: string }> = {
  BUG: { label: "Bug", color: "#ef4444" },
  FEATURE: { label: "Feature", color: "#6366f1" },
  TASK: { label: "Task", color: "#64748b" },
  INCIDENT: { label: "Incident", color: "#db2777" },
};

export const ROLE_META: Record<Role, { label: string; description: string }> = {
  OWNER: { label: "Owner", description: "Full control, including deleting the project" },
  ADMIN: { label: "Admin", description: "Manage settings, members, labels and API keys" },
  MEMBER: { label: "Member", description: "Create, edit and comment on issues" },
  VIEWER: { label: "Viewer", description: "Read-only access" },
};

export const PROJECT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
] as const;

export function issueKey(projectKey: string, number: number) {
  return `${projectKey}-${number}`;
}

/** Email local part, used as an @mention handle. */
export function handleFor(email: string) {
  return email.split("@")[0].toLowerCase();
}
