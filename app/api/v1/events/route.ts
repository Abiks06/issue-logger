import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { authenticateApiKey, apiError, rateLimitHeaders } from "@/lib/api-auth";
import { ingestEventSchema } from "@/lib/validation";
import { computeFingerprint, describeEvent, priorityForLevel, typeForLevel } from "@/lib/ingest";
import { insertIssue, notify, topPosition } from "@/lib/issue-service";
import { CLOSED_STATUSES, issueKey, type Status } from "@/lib/constants";
import { appUrl } from "@/lib/mail";

/**
 * POST /api/v1/events — report an error or incident from your own services.
 *
 * Events are grouped by fingerprint: the first one opens an issue, repeats
 * bump its occurrence count, and a repeat on a resolved issue reopens it as
 * a regression and notifies the assignee.
 */
export async function POST(request: Request) {
  const authResult = await authenticateApiKey(request);
  if (!authResult.ok) return authResult.response;
  const { apiKey, limit } = authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "Body must be JSON.", rateLimitHeaders(limit));
  }
  const parsed = ingestEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid event.", details: z.flattenError(parsed.error).fieldErrors },
      { status: 422, headers: rateLimitHeaders(limit) },
    );
  }
  const event = parsed.data;
  const fingerprint = computeFingerprint(event);
  const projectId = apiKey.projectId;
  const now = new Date();

  const ingest = () => prisma.$transaction(async (tx) => {
    const existing = await tx.issue.findUnique({
      where: { projectId_fingerprint: { projectId, fingerprint } },
    });

    if (!existing) {
      const issue = await insertIssue(tx, projectId, {
        title: event.title,
        description: describeEvent(event),
        status: "TODO",
        priority: priorityForLevel(event.level),
        type: typeForLevel(event.level),
        source: "API",
        fingerprint,
        environment: event.environment ?? null,
        lastSeenAt: now,
      });
      return { issue, created: true, regressed: false };
    }

    const regressed = CLOSED_STATUSES.includes(existing.status as Status);
    const issue = await tx.issue.update({
      where: { id: existing.id },
      data: {
        occurrences: { increment: 1 },
        lastSeenAt: now,
        environment: event.environment ?? existing.environment,
        ...(regressed
          ? { status: "TODO", closedAt: null, position: await topPosition(tx, projectId, "TODO") }
          : {}),
      },
    });

    if (regressed) {
      await tx.activity.create({
        data: { issueId: issue.id, kind: "REGRESSED", field: "status", fromValue: existing.status, toValue: "TODO" },
      });
      await notify(tx, {
        userIds: [issue.assigneeId, issue.reporterId],
        actorId: null,
        issueId: issue.id,
        type: "REGRESSED",
      });
    }
    return { issue, created: false, regressed };
  });

  let result: Awaited<ReturnType<typeof ingest>>;
  try {
    result = await ingest();
  } catch (err) {
    // Two first-time events with the same fingerprint raced; the loser now
    // finds the winner's issue and records an occurrence instead.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") result = await ingest();
    else throw err;
  }

  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { key: true } });

  return NextResponse.json(
    {
      issue: {
        key: issueKey(project.key, result.issue.number),
        url: appUrl(`/projects/${project.key}/issues/${result.issue.number}`),
        occurrences: result.issue.occurrences,
        status: result.issue.status,
      },
      created: result.created,
      regressed: result.regressed,
    },
    { status: result.created ? 201 : 200, headers: rateLimitHeaders(limit) },
  );
}
