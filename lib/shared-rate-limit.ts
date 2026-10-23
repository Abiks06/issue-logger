import "server-only";
import { prisma } from "@/lib/db";
import { createRateLimiter } from "@/lib/rate-limit";
import { sha256 } from "@/lib/tokens";

// Fixed-window rate limiter stored in Postgres, so limits hold across every
// server instance (serverless functions included). One atomic upsert per check.
// If the database is unreachable it falls back to a per-instance memory
// limiter rather than failing open.

export type LimitResult = { ok: boolean; remaining: number; resetAt: number };

export function createSharedRateLimiter({ name, limit, windowMs }: { name: string; limit: number; windowMs: number }) {
  const fallback = createRateLimiter({ limit, windowMs });

  return async function check(rawKey: string): Promise<LimitResult> {
    // Hash so identifiers (emails, API keys) never land in the table.
    const key = `${name}:${sha256(rawKey).slice(0, 48)}`;
    const now = new Date();
    const fresh = new Date(now.getTime() + windowMs);
    try {
      const [row] = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
        INSERT INTO "RateLimit" ("key", "count", "resetAt") VALUES (${key}, 1, ${fresh})
        ON CONFLICT ("key") DO UPDATE SET
          "count"   = CASE WHEN "RateLimit"."resetAt" <= ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
          "resetAt" = CASE WHEN "RateLimit"."resetAt" <= ${now} THEN ${fresh} ELSE "RateLimit"."resetAt" END
        RETURNING "count", "resetAt"`;

      // Occasionally sweep expired windows so the table stays small.
      if (Math.random() < 0.01) {
        prisma.rateLimit.deleteMany({ where: { resetAt: { lt: now } } }).catch(() => {});
      }

      const count = Number(row.count);
      return { ok: count <= limit, remaining: Math.max(0, limit - count), resetAt: row.resetAt.getTime() };
    } catch (err) {
      console.error(`Rate limiter "${name}" fell back to memory`, err);
      return fallback(key);
    }
  };
}
