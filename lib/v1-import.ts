// Pure planning for importing an Issue Logger v1 database into v2
// (scripts/migrate-v1.ts does the I/O). v1 issues were private to their
// author, so each v1 user gets a personal project they own: nobody can see
// another user's issues after the import.

export type V1User = {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  /** v1's schema drifted: older databases store a boolean, newer a timestamp. */
  emailVerified: boolean | Date | null;
  createdAt: Date;
};

export type V1Issue = {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
  userId: number | null;
};

export type PlannedIssue = {
  v1Id: number;
  number: number;
  title: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
};

export type PlannedProject = { ownerEmail: string; key: string; name: string; issues: PlannedIssue[] };

export type ImportPlan = {
  users: { email: string; name: string; passwordHash: string; emailVerified: Date | null; createdAt: Date; exists: boolean }[];
  projects: PlannedProject[];
  /** v1 issues whose author was deleted; imported only when an owner is given. */
  orphans: number;
};

export const IMPORT_MARKER = "Imported from Issue Logger v1.";

const STATUS: Record<string, PlannedIssue["status"]> = { OPEN: "TODO", IN_PROGRESS: "IN_PROGRESS", CLOSED: "DONE" };
const PRIORITY: Record<string, PlannedIssue["priority"]> = { LOW: "LOW", MEDIUM: "MEDIUM", HIGH: "HIGH", CRITICAL: "URGENT" };

export function mapStatus(v1: string) {
  return STATUS[v1] ?? "TODO";
}

export function mapPriority(v1: string) {
  return PRIORITY[v1] ?? "MEDIUM";
}

export function mapVerified(value: V1User["emailVerified"], createdAt: Date): Date | null {
  if (value instanceof Date) return value;
  return value ? createdAt : null;
}

/**
 * A free project key from someone's name: initials (or the first letters of a
 * single name), then a number if taken. Matches v2's 2–6 character rule.
 */
export function projectKeyFor(name: string, taken: Set<string>) {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  let base = (words.length > 1 ? words.map((w) => w[0]).join("") : (words[0] ?? "")).replace(/^[0-9]+/, "").slice(0, 4);
  if (base.length < 2) base = (base + "USR").slice(0, 3);
  if (base === "NEW") base = "NEWU";
  if (!taken.has(base)) return base;
  for (let n = 2; n < 100; n++) {
    const key = `${base.slice(0, 4)}${n}`;
    if (!taken.has(key)) return key;
  }
  throw new Error(`No free project key for ${name}`);
}

function planIssues(issues: V1Issue[]): PlannedIssue[] {
  return [...issues]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id)
    .map((i, idx) => {
      const status = mapStatus(i.status);
      return {
        v1Id: i.id,
        number: idx + 1,
        title: i.title.slice(0, 255),
        description: i.description,
        status,
        priority: mapPriority(i.priority),
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
        // v1 kept no close time; its last update is the best available estimate.
        closedAt: status === "DONE" ? i.updatedAt : null,
      };
    });
}

export function planImport({
  users,
  issues,
  existingEmails,
  takenKeys,
  orphanOwnerEmail,
}: {
  users: V1User[];
  issues: V1Issue[];
  existingEmails: Set<string>;
  takenKeys: Set<string>;
  orphanOwnerEmail?: string;
}): ImportPlan {
  const taken = new Set(takenKeys);
  const byUser = new Map<number, V1Issue[]>();
  for (const issue of issues) {
    if (issue.userId === null) continue;
    byUser.set(issue.userId, [...(byUser.get(issue.userId) ?? []), issue]);
  }

  const projects: PlannedProject[] = [];
  for (const user of users) {
    const own = byUser.get(user.id);
    if (!own?.length) continue;
    const key = projectKeyFor(user.name, taken);
    taken.add(key);
    projects.push({ ownerEmail: user.email.toLowerCase(), key, name: `${user.name.slice(0, 60)}'s issues`, issues: planIssues(own) });
  }

  const orphans = issues.filter((i) => i.userId === null || !users.some((u) => u.id === i.userId));
  if (orphans.length && orphanOwnerEmail) {
    const key = projectKeyFor("V1 Unowned", taken);
    taken.add(key);
    projects.push({ ownerEmail: orphanOwnerEmail.toLowerCase(), key, name: "Unowned v1 issues", issues: planIssues(orphans) });
  }

  return {
    users: users.map((u) => ({
      email: u.email.toLowerCase(),
      name: u.name,
      passwordHash: u.passwordHash,
      emailVerified: mapVerified(u.emailVerified, u.createdAt),
      createdAt: u.createdAt,
      exists: existingEmails.has(u.email.toLowerCase()),
    })),
    projects,
    orphans: orphanOwnerEmail ? 0 : orphans.length,
  };
}
