import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bearerToken, sha256 } from "@/lib/tokens";
import { createRateLimiter } from "@/lib/rate-limit";

// API-key authentication for /api/v1. Keys are project-scoped.

const limiter = createRateLimiter({ limit: 120, windowMs: 60_000 });

type Limit = ReturnType<typeof limiter>;

export function rateLimitHeaders(limit: Limit) {
  return {
    "X-RateLimit-Remaining": String(limit.remaining),
    "X-RateLimit-Reset": String(Math.ceil(limit.resetAt / 1000)),
  };
}

export function apiError(status: number, error: string, headers?: Record<string, string>) {
  return NextResponse.json({ error }, { status, headers });
}

export async function authenticateApiKey(request: Request) {
  const token = bearerToken(request.headers.get("authorization"));
  if (!token) {
    return { ok: false as const, response: apiError(401, "Missing API key. Send `Authorization: Bearer <key>`.") };
  }

  const hashedKey = sha256(token);
  const limit = limiter(hashedKey);
  if (!limit.ok) {
    return {
      ok: false as const,
      response: apiError(429, "Rate limit exceeded.", {
        ...rateLimitHeaders(limit),
        "Retry-After": String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000))),
      }),
    };
  }

  const apiKey = await prisma.apiKey.findUnique({ where: { hashedKey } });
  if (!apiKey || apiKey.revokedAt) return { ok: false as const, response: apiError(401, "Invalid or revoked API key.") };

  // Throttle the bookkeeping write to once a minute per key.
  if (!apiKey.lastUsedAt || Date.now() - apiKey.lastUsedAt.getTime() > 60_000) {
    await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
  }

  return { ok: true as const, apiKey, limit };
}
