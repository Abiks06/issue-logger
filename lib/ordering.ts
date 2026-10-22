// Fractional ordering for board columns: an item dropped between two
// neighbours takes the midpoint, so a move rewrites a single row.

export const POSITION_STEP = 1024;

/** Position for an item placed between `before` and `after` (either may be missing). */
export function positionBetween(before: number | null | undefined, after: number | null | undefined) {
  const hasBefore = before !== null && before !== undefined;
  const hasAfter = after !== null && after !== undefined;
  if (hasBefore && hasAfter) return (before + after) / 2;
  if (hasBefore) return before + POSITION_STEP;
  if (hasAfter) return after - POSITION_STEP;
  return 0;
}

/**
 * True when neighbours have drifted so close that midpoints lose precision
 * and the column should be renumbered.
 */
export function needsRebalance(before: number | null | undefined, after: number | null | undefined) {
  if (before === null || before === undefined || after === null || after === undefined) return false;
  return Math.abs(after - before) < 1e-6;
}

/** Evenly spaced positions for `count` items, used when rebalancing a column. */
export function spreadPositions(count: number) {
  return Array.from({ length: count }, (_, i) => (i + 1) * POSITION_STEP);
}
