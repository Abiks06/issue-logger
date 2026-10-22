import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiKey, rateLimitHeaders } from "@/lib/api-auth";
import { STATUSES, issueKey, type Status } from "@/lib/constants";

/** GET /api/v1/issues?status=TODO,IN_PROGRESS&limit=50 — read the key's project issues. */
export async function GET(request: Request) {
  const authResult = await authenticateApiKey(request);
  if (!authResult.ok) return authResult.response;
  const { apiKey, limit } = authResult;

  const url = new URL(request.url);
  const statuses = (url.searchParams.get("status") ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is Status => (STATUSES as readonly string[]).includes(s));
  const take = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));

  const [project, issues] = await Promise.all([
    prisma.project.findUniqueOrThrow({ where: { id: apiKey.projectId }, select: { key: true } }),
    prisma.issue.findMany({
      where: { projectId: apiKey.projectId, ...(statuses.length ? { status: { in: statuses } } : {}) },
      orderBy: { updatedAt: "desc" },
      take,
      select: {
        number: true, title: true, status: true, priority: true, type: true, source: true,
        occurrences: true, lastSeenAt: true, createdAt: true, updatedAt: true,
        assignee: { select: { name: true } },
      },
    }),
  ]);

  return NextResponse.json(
    {
      issues: issues.map(({ number, assignee, ...rest }) => ({
        key: issueKey(project.key, number),
        ...rest,
        assignee: assignee?.name ?? null,
      })),
    },
    { headers: rateLimitHeaders(limit) },
  );
}
