import type { Role } from "@/lib/constants";

// ─── Role model ───────────────────────────────────────────────────────
// Roles are strictly ordered; every capability names the lowest role that has it.

const RANK: Record<Role, number> = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 };

const CAPABILITIES = {
  "project:view": "VIEWER",
  "issue:write": "MEMBER",
  "issue:comment": "MEMBER",
  "issue:delete": "ADMIN",
  "project:manage": "ADMIN",
  "project:delete": "OWNER",
} as const satisfies Record<string, Role>;

export type Capability = keyof typeof CAPABILITIES;

export function atLeast(role: Role, min: Role) {
  return RANK[role] >= RANK[min];
}

export function can(role: Role | null | undefined, capability: Capability) {
  if (!role) return false;
  return atLeast(role, CAPABILITIES[capability]);
}

/**
 * Whether `actor` may move a member from `currentRole` to `nextRole`.
 * Admins manage roles below their own; only owners grant or revoke admin/owner.
 */
export function canChangeRole(actor: Role, currentRole: Role, nextRole: Role) {
  if (!can(actor, "project:manage")) return false;
  if (actor === "OWNER") return true;
  return RANK[currentRole] < RANK[actor] && RANK[nextRole] < RANK[actor];
}

/** Whether `actor` may remove a member holding `targetRole`. */
export function canRemoveMember(actor: Role, targetRole: Role) {
  if (!can(actor, "project:manage")) return false;
  return actor === "OWNER" || RANK[targetRole] < RANK[actor];
}
