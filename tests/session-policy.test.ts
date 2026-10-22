import { describe, expect, it } from "vitest";
import { RECHECK_INTERVAL_MS, SHORT_SESSION_IDLE_MS, idleExpired, needsRecheck, parseRemember } from "@/lib/session-policy";
import { diffIssue } from "@/lib/activity";

describe("idleExpired", () => {
  const now = 1_000_000_000_000;

  it("never expires remembered sessions", () => {
    expect(idleExpired({ remember: true, lastSeen: 0 }, now)).toBe(false);
    expect(idleExpired({ lastSeen: 0 }, now)).toBe(false);
  });

  it("expires short sessions after the idle limit", () => {
    expect(idleExpired({ remember: false, lastSeen: now - SHORT_SESSION_IDLE_MS + 1000 }, now)).toBe(false);
    expect(idleExpired({ remember: false, lastSeen: now - SHORT_SESSION_IDLE_MS - 1000 }, now)).toBe(true);
  });
});

describe("needsRecheck", () => {
  it("rechecks once the interval has passed", () => {
    const now = 5_000_000;
    expect(needsRecheck({ checkedAt: now - 1000 }, now)).toBe(false);
    expect(needsRecheck({ checkedAt: now - RECHECK_INTERVAL_MS - 1 }, now)).toBe(true);
    expect(needsRecheck({}, now)).toBe(true);
  });
});

describe("parseRemember", () => {
  it("defaults to remembering", () => {
    expect(parseRemember(undefined)).toBe(true);
    expect(parseRemember("true")).toBe(true);
    expect(parseRemember("false")).toBe(false);
    expect(parseRemember(false)).toBe(false);
  });
});

describe("diffIssue parent", () => {
  it("records parent changes", () => {
    const prev = {
      title: "t", description: "", status: "TODO", priority: "NONE", type: "TASK",
      assigneeId: null, parentId: null, dueDate: null, estimate: null, labelIds: [],
    };
    expect(diffIssue(prev, { parentId: "p1" })).toEqual([{ field: "parent", from: null, to: "p1" }]);
    expect(diffIssue({ ...prev, parentId: "p1" }, { parentId: "p1" })).toEqual([]);
  });
});
