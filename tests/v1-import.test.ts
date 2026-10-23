import { describe, expect, it } from "vitest";
import { mapPriority, mapStatus, mapVerified, planImport, projectKeyFor, type V1Issue, type V1User } from "@/lib/v1-import";

const d = (s: string) => new Date(`${s}T10:00:00Z`);

const users: V1User[] = [
  { id: 1, name: "Ada Lovelace", email: "Ada@Example.com", passwordHash: "$2b$12$a", emailVerified: true, createdAt: d("2026-01-01") },
  { id: 2, name: "Linus", email: "linus@example.com", passwordHash: "$2b$12$b", emailVerified: d("2026-02-02"), createdAt: d("2026-02-01") },
  { id: 3, name: "Quiet User", email: "quiet@example.com", passwordHash: "$2b$12$c", emailVerified: false, createdAt: d("2026-03-01") },
];

const issues: V1Issue[] = [
  { id: 10, title: "Second", description: "b", status: "CLOSED", priority: "CRITICAL", createdAt: d("2026-04-02"), updatedAt: d("2026-04-05"), userId: 1 },
  { id: 11, title: "First", description: "a", status: "OPEN", priority: "LOW", createdAt: d("2026-04-01"), updatedAt: d("2026-04-01"), userId: 1 },
  { id: 12, title: "Linus's", description: "c", status: "IN_PROGRESS", priority: "HIGH", createdAt: d("2026-04-03"), updatedAt: d("2026-04-03"), userId: 2 },
  { id: 13, title: "Orphan", description: "d", status: "OPEN", priority: "MEDIUM", createdAt: d("2026-04-04"), updatedAt: d("2026-04-04"), userId: null },
];

describe("field mapping", () => {
  it("maps v1 statuses and priorities", () => {
    expect(["OPEN", "IN_PROGRESS", "CLOSED", "WEIRD"].map(mapStatus)).toEqual(["TODO", "IN_PROGRESS", "DONE", "TODO"]);
    expect(["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(mapPriority)).toEqual(["LOW", "MEDIUM", "HIGH", "URGENT"]);
  });

  it("handles both shapes of the drifted emailVerified column", () => {
    expect(mapVerified(true, d("2026-01-01"))).toEqual(d("2026-01-01"));
    expect(mapVerified(false, d("2026-01-01"))).toBeNull();
    expect(mapVerified(d("2026-02-02"), d("2026-01-01"))).toEqual(d("2026-02-02"));
    expect(mapVerified(null, d("2026-01-01"))).toBeNull();
  });
});

describe("projectKeyFor", () => {
  it("derives valid, unique keys", () => {
    expect(projectKeyFor("Ada Lovelace", new Set())).toBe("AL");
    expect(projectKeyFor("Ada Lovelace", new Set(["AL"]))).toBe("AL2");
    expect(projectKeyFor("linus", new Set())).toBe("LINU");
    expect(projectKeyFor("X", new Set())).toBe("XUS");
    expect(projectKeyFor("New", new Set())).toBe("NEWU");
    for (const k of ["AL", "AL2", "LINU", "XUS", "NEWU"]) expect(k).toMatch(/^[A-Z][A-Z0-9]{1,5}$/);
  });
});

describe("planImport", () => {
  const plan = planImport({ users, issues, existingEmails: new Set(["linus@example.com"]), takenKeys: new Set(["AL"]) });

  it("gives each user with issues a private project", () => {
    expect(plan.projects.map((p) => [p.ownerEmail, p.key, p.name])).toEqual([
      ["ada@example.com", "AL2", "Ada Lovelace's issues"],
      ["linus@example.com", "LINU", "Linus's issues"],
    ]);
  });

  it("numbers issues by creation date and maps closed issues", () => {
    const ada = plan.projects[0].issues;
    expect(ada.map((i) => [i.number, i.title, i.status, i.priority])).toEqual([
      [1, "First", "TODO", "LOW"],
      [2, "Second", "DONE", "URGENT"],
    ]);
    expect(ada[1].closedAt).toEqual(d("2026-04-05"));
    expect(ada[0].closedAt).toBeNull();
  });

  it("imports every account, flags existing ones, and keeps password hashes", () => {
    expect(plan.users.map((u) => [u.email, u.exists, u.passwordHash])).toEqual([
      ["ada@example.com", false, "$2b$12$a"],
      ["linus@example.com", true, "$2b$12$b"],
      ["quiet@example.com", false, "$2b$12$c"],
    ]);
  });

  it("reports orphans unless an owner is named", () => {
    expect(plan.orphans).toBe(1);
    const withOwner = planImport({ users, issues, existingEmails: new Set(), takenKeys: new Set(), orphanOwnerEmail: "ada@example.com" });
    expect(withOwner.orphans).toBe(0);
    expect(withOwner.projects.at(-1)).toMatchObject({ ownerEmail: "ada@example.com", name: "Unowned v1 issues" });
  });
});
