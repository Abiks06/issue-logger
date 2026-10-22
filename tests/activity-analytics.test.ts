import { describe, expect, it } from "vitest";
import { diffIssue, extractMentions, resolveMentions } from "@/lib/activity";
import { formatDuration, isOverdue, median, medianResolutionHours, throughput } from "@/lib/analytics";
import { csvCell, toCsv } from "@/lib/csv";
import { issuePatchSchema } from "@/lib/validation";

const base = {
  title: "Login fails",
  description: "x",
  status: "TODO",
  priority: "HIGH",
  type: "BUG",
  assigneeId: null,
  dueDate: null,
  estimate: null,
  labelIds: ["a", "b"],
};

describe("diffIssue", () => {
  it("records only changed fields", () => {
    const changes = diffIssue(base, { status: "DONE", priority: "HIGH", labelIds: ["b", "a"] });
    expect(changes).toEqual([{ field: "status", from: "TODO", to: "DONE" }]);
  });

  it("omits description text from the log", () => {
    expect(diffIssue(base, { description: "y" })).toEqual([{ field: "description", from: null, to: null }]);
  });

  it("compares due dates by day", () => {
    const changes = diffIssue(base, { dueDate: new Date("2026-11-01T12:00:00Z") });
    expect(changes).toEqual([{ field: "dueDate", from: null, to: "2026-11-01" }]);
  });
});

describe("issuePatchSchema", () => {
  it("does not inject defaults into partial updates", () => {
    expect(issuePatchSchema.parse({ priority: "LOW" })).toEqual({ priority: "LOW" });
  });
});

describe("mentions", () => {
  it("extracts handles but skips emails and code", () => {
    const text = "Hey @ada and @Grace.hopper, mail bob@example.com. `@notme`\n```\n@nope\n```";
    expect(extractMentions(text).sort()).toEqual(["ada", "grace.hopper"]);
  });

  it("resolves handles to members by email local part", () => {
    const members = [{ email: "ada@x.io" }, { email: "linus@x.io" }];
    expect(resolveMentions(["ada"], members)).toEqual([{ email: "ada@x.io" }]);
  });
});

describe("analytics", () => {
  const now = new Date("2026-10-22T15:00:00Z");
  const issues = [
    { createdAt: new Date("2026-10-20T10:00:00Z"), closedAt: new Date("2026-10-22T10:00:00Z"), status: "DONE", priority: "HIGH", assigneeId: null, dueDate: null },
    { createdAt: new Date("2026-10-22T09:00:00Z"), closedAt: null, status: "TODO", priority: "LOW", assigneeId: null, dueDate: new Date("2026-10-21T00:00:00Z") },
  ];

  it("buckets created and resolved by day", () => {
    const points = throughput(issues, 3, now);
    expect(points.map((p) => p.date)).toEqual(["2026-10-20", "2026-10-21", "2026-10-22"]);
    expect(points.map((p) => p.created)).toEqual([1, 0, 1]);
    expect(points.map((p) => p.resolved)).toEqual([0, 0, 1]);
  });

  it("computes median resolution time", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
    expect(medianResolutionHours(issues, 30, now)).toBe(48);
  });

  it("detects overdue open issues", () => {
    expect(isOverdue(issues[1], now)).toBe(true);
    expect(isOverdue(issues[0], now)).toBe(false);
  });

  it("formats durations", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(0.5)).toBe("30m");
    expect(formatDuration(5)).toBe("5h");
    expect(formatDuration(72)).toBe("3d");
  });
});

describe("csv", () => {
  it("quotes and neutralises formulas", () => {
    expect(csvCell('say "hi", ok')).toBe('"say ""hi"", ok"');
    expect(csvCell("=HYPERLINK()")).toBe("'=HYPERLINK()");
    expect(csvCell(null)).toBe("");
    expect(toCsv(["a", "b"], [[1, "x"]])).toBe("a,b\r\n1,x\r\n");
  });
});
