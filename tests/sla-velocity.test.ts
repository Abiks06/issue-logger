import { describe, expect, it } from "vitest";
import {
  DEFAULT_TARGETS, describeClock, evaluateClock, evaluateSla, hitRate, isResponse, slaWhere, targetsFromRows, worstOf,
} from "@/lib/sla";
import { averageVelocity, forecastWeeks, startOfWeek, weeklyVelocity } from "@/lib/velocity";

const H = 3_600_000;
const now = new Date("2026-10-22T12:00:00Z"); // a Thursday

describe("evaluateClock", () => {
  const start = new Date(now.getTime() - 5 * H);

  it("is on track early in the window", () => {
    expect(evaluateClock(start, 24 * 60, null, now).state).toBe("on_track");
  });

  it("is at risk in the last quarter", () => {
    expect(evaluateClock(start, 6 * 60, null, now).state).toBe("at_risk"); // 1h of 6h left
  });

  it("is breached once overdue", () => {
    const c = evaluateClock(start, 4 * 60, null, now);
    expect(c.state).toBe("breached");
    expect(describeClock(c)).toBe("1h overdue");
  });

  it("records met or missed when stopped", () => {
    expect(evaluateClock(start, 4 * 60, new Date(start.getTime() + 3 * H), now).state).toBe("met");
    const missed = evaluateClock(start, 4 * 60, new Date(start.getTime() + 6 * H), now);
    expect(missed.state).toBe("breached");
    expect(describeClock(missed)).toBe("missed by 2h");
  });
});

describe("evaluateSla", () => {
  const base = { priority: "URGENT", status: "TODO", createdAt: new Date(now.getTime() - 2 * H), firstResponseAt: null, closedAt: null };

  it("reports the worst clock", () => {
    const sla = evaluateSla(base, DEFAULT_TARGETS, now);
    expect(sla.respond?.state).toBe("breached"); // 1h response target
    expect(sla.resolve?.state).toBe("on_track"); // 8h resolution target
    expect(sla.worst).toBe("breached");
  });

  it("separates a missed response from what is live now", () => {
    const late = new Date(base.createdAt.getTime() + 90 * 60_000); // answered after the 1h target
    const sla = evaluateSla({ ...base, firstResponseAt: late }, DEFAULT_TARGETS, now);
    expect(sla.respond?.state).toBe("breached");
    expect(sla.worst).toBe("breached");
    expect(sla.live).toBe("on_track"); // resolution still has time
  });

  it("treats closing as responding", () => {
    const closedAt = new Date(now.getTime() - 90 * 60_000);
    const sla = evaluateSla({ ...base, status: "DONE", closedAt }, DEFAULT_TARGETS, now);
    expect(sla.resolve?.state).toBe("met");
    expect(sla.respond?.stoppedAt).toEqual(closedAt);
  });

  it("ignores canceled issues and priorities without targets", () => {
    expect(evaluateSla({ ...base, status: "CANCELED" }, DEFAULT_TARGETS, now).worst).toBeNull();
    expect(evaluateSla({ ...base, priority: "NONE" }, DEFAULT_TARGETS, now).worst).toBeNull();
  });
});

describe("helpers", () => {
  it("ranks states", () => {
    expect(worstOf(["met", "at_risk", "on_track"])).toBe("at_risk");
    expect(worstOf([null, undefined])).toBeNull();
  });

  it("counts a first response when work leaves the queue", () => {
    expect(isResponse({ fromStatus: "TODO", toStatus: "IN_PROGRESS" })).toBe(true);
    expect(isResponse({ fromStatus: "TODO", toStatus: "BACKLOG" })).toBe(false);
    expect(isResponse({ fromStatus: "IN_PROGRESS", toStatus: "DONE" })).toBe(false);
  });

  it("computes hit rate over stopped clocks only", () => {
    const start = new Date(now.getTime() - 10 * H);
    const met = evaluateClock(start, 600, new Date(start.getTime() + H), now);
    const missed = evaluateClock(start, 60, new Date(start.getTime() + 2 * H), now);
    const running = evaluateClock(start, 6000, null, now);
    expect(hitRate([met, missed, running, null])).toBe(0.5);
    expect(hitRate([running])).toBeNull();
  });

  it("builds targets from rows, skipping empty ones", () => {
    expect(targetsFromRows([
      { priority: "HIGH", respondMinutes: 60, resolveMinutes: null },
      { priority: "LOW", respondMinutes: null, resolveMinutes: null },
    ])).toEqual({ HIGH: { respond: 60, resolve: null } });
  });

  it("builds a breach filter per priority and clock", () => {
    const where = slaWhere({ HIGH: { respond: 60, resolve: 120 } }, "breached", now);
    expect(where.OR).toHaveLength(2);
    expect(where.OR?.[1]).toMatchObject({ priority: "HIGH", firstResponseAt: null, createdAt: { lt: new Date(now.getTime() - H) } });
    expect(slaWhere({}, "breached", now)).toEqual({ id: { in: [] } });
  });
});

describe("velocity", () => {
  it("starts weeks on Monday UTC", () => {
    expect(startOfWeek(now).toISOString()).toBe("2026-10-19T00:00:00.000Z");
    expect(startOfWeek(new Date("2026-10-25T23:00:00Z")).toISOString()).toBe("2026-10-19T00:00:00.000Z");
  });

  it("buckets done points per week and forecasts", () => {
    const issues = [
      { status: "DONE", closedAt: new Date("2026-10-20T10:00:00Z"), estimate: 3 },
      { status: "DONE", closedAt: new Date("2026-10-14T10:00:00Z"), estimate: 5 },
      { status: "DONE", closedAt: new Date("2026-10-13T10:00:00Z"), estimate: null },
      { status: "CANCELED", closedAt: new Date("2026-10-13T10:00:00Z"), estimate: 8 },
      { status: "DONE", closedAt: new Date("2026-10-06T10:00:00Z"), estimate: 3 },
    ];
    const weeks = weeklyVelocity(issues, 3, now);
    expect(weeks.map((w) => [w.weekStart, w.points, w.issues, w.unestimated, w.partial])).toEqual([
      ["2026-10-05", 3, 1, 0, false],
      ["2026-10-12", 5, 2, 1, false],
      ["2026-10-19", 3, 1, 0, true],
    ]);
    expect(averageVelocity(weeks)).toBe(4); // current partial week excluded
    expect(forecastWeeks(10, 4)).toBe(2.5);
    expect(forecastWeeks(10, 0)).toBeNull();
  });
});
