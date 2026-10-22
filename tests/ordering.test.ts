import { describe, expect, it } from "vitest";
import { POSITION_STEP, needsRebalance, positionBetween, spreadPositions } from "@/lib/ordering";

describe("positionBetween", () => {
  it("takes the midpoint between neighbours", () => {
    expect(positionBetween(0, 1024)).toBe(512);
    expect(positionBetween(-10, 10)).toBe(0);
  });

  it("extends past a single neighbour", () => {
    expect(positionBetween(100, null)).toBe(100 + POSITION_STEP);
    expect(positionBetween(undefined, 100)).toBe(100 - POSITION_STEP);
  });

  it("starts an empty column at zero", () => {
    expect(positionBetween(null, null)).toBe(0);
  });

  it("keeps ordering stable through repeated inserts", () => {
    let lo = 0;
    const hi = 1;
    for (let i = 0; i < 30; i++) {
      const mid = positionBetween(lo, hi);
      expect(mid).toBeGreaterThan(lo);
      expect(mid).toBeLessThan(hi);
      lo = mid;
    }
  });
});

describe("needsRebalance", () => {
  it("flags neighbours that are too close", () => {
    expect(needsRebalance(1, 1 + 1e-9)).toBe(true);
    expect(needsRebalance(1, 2)).toBe(false);
    expect(needsRebalance(null, 2)).toBe(false);
  });
});

describe("spreadPositions", () => {
  it("spaces items evenly", () => {
    expect(spreadPositions(3)).toEqual([1024, 2048, 3072]);
  });
});
