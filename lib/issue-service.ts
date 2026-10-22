import "server-only";
import type { NotificationType, Prisma } from "@prisma/client";
import { ActionError } from "@/lib/access";
import { CLOSED_STATUSES, type Status } from "@/lib/constants";
import { POSITION_STEP } from "@/lib/ordering";

// Database operations shared by server actions and the ingestion API.

type Tx = Prisma.TransactionClient;

/** Position that puts a new issue at the top of its status column. */
export async function topPosition(tx: Tx, projectId: string, status: Status) {
  const first = await tx.issue.findFirst({
    where: { projectId, status },
    orderBy: { position: "asc" },
    select: { position: true },
  });
  return first ? first.position - POSITION_STEP : 0;
}

/** closedAt value implied by a status transition (undefined = leave as is). */
export function closedAtFor(prev: Status | null, next: Status) {
  const wasClosed = prev !== null && CLOSED_STATUSES.includes(prev);
  const isClosed = CLOSED_STATUSES.includes(next);
  if (isClosed && !wasClosed) return new Date();
  if (!isClosed && wasClosed) return null;
  return undefined;
}

/** Rejects assignees or labels that don't belong to the project. */
export async function assertProjectRefs(
  tx: Tx,
  projectId: string,
  { assigneeId, labelIds, parentId, issueId }: { assigneeId?: string | null; labelIds?: string[]; parentId?: string | null; issueId?: string },
) {
  if (assigneeId) {
    const member = await tx.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: assigneeId } },
      select: { id: true },
    });
    if (!member) throw new ActionError("The assignee must be a project member.");
  }
  if (labelIds?.length) {
    const count = await tx.label.count({ where: { projectId, id: { in: labelIds } } });
    if (count !== new Set(labelIds).size) throw new ActionError("Unknown label.");
  }
  if (parentId) {
    if (parentId === issueId) throw new ActionError("An issue can't be its own parent.");
    // Walk up from the proposed parent; meeting this issue would create a cycle.
    let cursor: string | null = parentId;
    for (let depth = 0; cursor && depth < 50; depth++) {
      const row: { projectId: string; parentId: string | null } | null = await tx.issue.findUnique({
        where: { id: cursor },
        select: { projectId: true, parentId: true },
      });
      if (!row || row.projectId !== projectId) throw new ActionError("The parent must be an issue in this project.");
      if (row.parentId === issueId && issueId) throw new ActionError("That would make the issue a sub-issue of itself.");
      cursor = row.parentId;
    }
  }
}

/** Creates an issue with the next per-project number. Call inside a transaction. */
export async function insertIssue(
  tx: Tx,
  projectId: string,
  data: Omit<Prisma.IssueUncheckedCreateInput, "projectId" | "number" | "position"> & { labelIds?: string[] },
) {
  // The increment takes a row lock on the project, so concurrent creates
  // serialize here and never reuse a number.
  const { issueCounter } = await tx.project.update({
    where: { id: projectId },
    data: { issueCounter: { increment: 1 } },
    select: { issueCounter: true },
  });
  const { labelIds, ...rest } = data;
  const status = (rest.status ?? "TODO") as Status;
  const issue = await tx.issue.create({
    data: {
      ...rest,
      projectId,
      number: issueCounter,
      position: await topPosition(tx, projectId, status),
      closedAt: CLOSED_STATUSES.includes(status) ? new Date() : null,
      labels: labelIds?.length ? { connect: labelIds.map((id) => ({ id })) } : undefined,
    },
  });
  await tx.activity.create({ data: { issueId: issue.id, actorId: rest.reporterId ?? null, kind: "CREATED" } });
  return issue;
}

/** Fan out a notification, skipping the actor and duplicate recipients. */
export async function notify(
  tx: Tx,
  { userIds, actorId, issueId, type }: { userIds: (string | null | undefined)[]; actorId: string | null; issueId: string; type: NotificationType },
) {
  const recipients = [...new Set(userIds.filter((id): id is string => Boolean(id) && id !== actorId))];
  if (recipients.length === 0) return;
  await tx.notification.createMany({
    data: recipients.map((userId) => ({ userId, actorId, issueId, type })),
  });
}
