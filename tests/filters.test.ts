import { describe, expect, it } from "vitest";
import { buildOrderBy, buildWhere, filtersToQuery, hasActiveFilters, parseFilters, parseIssueKey } from "@/lib/issue-filters";

describe("parseFilters", () => {
  it("keeps only known enum values and dedupes", () => {
    const f = parseFilters({ status: "todo,BOGUS,TODO,done", priority: ["urgent", "high"], sort: "priority", page: "3" });
    expect(f.status).toEqual(["TODO", "DONE"]);
    expect(f.priority).toEqual(["URGENT", "HIGH"]);
    expect(f.sort).toBe("priority");
    expect(f.page).toBe(3);
  });

  it("falls back on bad input", () => {
    const f = parseFilters({ sort: "drop table", page: "-4" });
    expect(f.sort).toBe("updated");
    expect(f.page).toBe(1);
    expect(hasActiveFilters(f)).toBe(false);
  });
});

describe("filtersToQuery", () => {
  it("round-trips through parseFilters", () => {
    const f = parseFilters({ q: "login bug", status: "TODO,IN_PROGRESS", assignee: "me", sort: "due" });
    const qs = filtersToQuery(f);
    expect(parseFilters(Object.fromEntries(new URLSearchParams(qs)))).toEqual(f);
  });

  it("resets the page when filters change", () => {
    const f = parseFilters({ page: "4" });
    expect(filtersToQuery(f, { status: ["DONE"] })).toBe("?status=DONE");
    expect(filtersToQuery(f, { page: 5 })).toBe("?page=5");
  });
});

describe("parseIssueKey", () => {
  it("recognises issue keys", () => {
    expect(parseIssueKey("api-42")).toEqual({ key: "API", number: 42 });
    expect(parseIssueKey("not a key")).toBeNull();
  });
});

describe("buildWhere", () => {
  it("translates assignee shortcuts", () => {
    const base = parseFilters({});
    expect(buildWhere("p", { ...base, assignee: "me" }, "u1").assigneeId).toBe("u1");
    expect(buildWhere("p", { ...base, assignee: "none" }, "u1").assigneeId).toBeNull();
  });

  it("matches numbers and keys in search", () => {
    const where = buildWhere("p", parseFilters({ q: "API-7" }), "u1");
    expect(where.OR).toContainEqual({ number: 7 });
  });
});

describe("buildOrderBy", () => {
  it("puts urgent first when sorting by priority", () => {
    expect(buildOrderBy("priority")[0]).toEqual({ priority: "desc" });
  });
});
