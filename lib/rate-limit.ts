// Fixed-window rate limiter kept in process memory. Good enough for a single
// instance; on a multi-instance deployment swap the Map for Redis/Upstash.

type Window = { count: number; resetAt: number };

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const windows = new Map<string, Window>();

  return function check(key: string, now = Date.now()) {
    let w = windows.get(key);
    if (!w || w.resetAt <= now) {
      w = { count: 0, resetAt: now + windowMs };
      windows.set(key, w);
    }
    w.count += 1;

    // Opportunistic cleanup so the map can't grow without bound.
    if (windows.size > 10_000) {
      for (const [k, v] of windows) if (v.resetAt <= now) windows.delete(k);
    }

    return {
      ok: w.count <= limit,
      remaining: Math.max(0, limit - w.count),
      resetAt: w.resetAt,
    };
  };
}
