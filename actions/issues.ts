"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ActionError, authorizeProject, currentUser } from "@/lib/access";
import { run, type ActionResult } from "@/lib/action";
import { can } from "@/lib/permissions";
import { diffIssue, extractMentions, resolveMentions } from "@/lib/activity";
import { needsRebalance, positionBetween, spreadPositions } from "@/lib/ordering";
import { assertProjectRefs, closedAtFor, insertIssue, notify, topPosition } from "@/lib/issue-service";
import { commentSchema, issuePatchSchema, issueSchema } from "@/lib/validation";
import { PRIORITIES, STATUSES, issueKey, type Role, type Status } from "@/lib/constants";
import { parseIssueKey } from "@/lib/issue-filters";
import { evaluateSla, isResponse, targetsFromRows } from "@/lib/sla";

function refresh(projectKey: string, number?: number) {
  revalidatePath(`/projects/${projectKey}`, "layout");
  if (number) revalidatePath(`/projects/${projectKey}/issues/${number}`);
  revalidatePath("/");
}

async function loadIssue(issueId: string) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: { labels: { select: { id: true } }, project: { select: { key: true } } },
  });
  if (!issue) throw new ActionError("Issue not found.");
  return issue;
}

// ─── Create ───────────────────────────────────────────────────────────

export async function createIssue(projectId: string, input: unknown): Promise<ActionResult<{ key: string; number: number }>> {
  return run(async () => {
    const { user } = await authorizeProject(projectId, "issue:write");
    const data = issueSchema.parse(input);

    const issue = await prisma.$transaction(async (tx) => {
      await assertProjectRefs(tx, projectId, data);
      const created = await insertIssue(tx, projectId, {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        type: data.type,
        assigneeId: data.assigneeId ?? null,
        parentId: data.parentId ?? null,
        dueDate: data.dueDate ?? null,
        estimate: data.estimate ?? null,
        reporterId: user.id,
        labelIds: data.labelIds,
      });
      await notify(tx, { userIds: [created.assigneeId], actorId: user.id, issueId: created.id, type: "ASSIGNED" });
      return created;
    });

    const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { key: true } });
    refresh(project.key);
    return { key: issueKey(project.key, issue.number), number: issue.number };
  });
}

// ─── Update ───────────────────────────────────────────────────────────

/**
 * Applies a patch with activity logging and notifications. Shared by the
 * single-issue editor, board moves and bulk edits.
 */
async function applyPatch(
  issue: Awaited<ReturnType<typeof loadIssue>>,
  patch: z.output<typeof issuePatchSchema>,
  actorId: string,
  extra: { position?: number } = {},
) {
  const changes = diffIssue(
    { ...issue, labelIds: issue.labels.map((l) => l.id) },
    {
      title: patch.title,
      description: patch.description,
      status: patch.status,
      priority: patch.priority,
      type: patch.type,
      assigneeId: patch.assigneeId,
      parentId: patch.parentId,
      dueDate: patch.dueDate,
      estimate: patch.estimate,
      labelIds: patch.labelIds,
    },
  );
  if (changes.length === 0 && extra.position === undefined) return;

  await prisma.$transaction(async (tx) => {
    await assertProjectRefs(tx, issue.projectId, {
      assigneeId: patch.assigneeId,
      labelIds: patch.labelIds,
      parentId: patch.parentId,
      issueId: issue.id,
    });

    const statusChanged = patch.status !== undefined && patch.status !== issue.status;
    let position = extra.position;
    const nextClosedAt = statusChanged ? closedAtFor(issue.status as Status, patch.status!) : undefined;
    if (statusChanged && position === undefined) position = await topPosition(tx, issue.projectId, patch.status!);

    await tx.issue.update({
      where: { id: issue.id },
      data: {
        title: patch.title,
        description: patch.description,
        status: patch.status,
        priority: patch.priority,
        type: patch.type,
        assigneeId: patch.assigneeId,
        parentId: patch.parentId,
        dueDate: patch.dueDate,
        estimate: patch.estimate,
        position,
        closedAt: nextClosedAt,
        // SLA bookkeeping: the first move out of the queue is the response, and a
        // new priority or a reopen re-arms alerts against the new situation.
        firstResponseAt: !issue.firstResponseAt && isResponse({ fromStatus: issue.status, toStatus: patch.status }) ? new Date() : undefined,
        slaAlert: (patch.priority !== undefined && patch.priority !== issue.priority) || nextClosedAt === null ? 0 : undefined,
        labels: patch.labelIds ? { set: patch.labelIds.map((id) => ({ id })) } : undefined,
      },
    });

    if (changes.length) {
      await tx.activity.createMany({
        data: changes.map((c) => ({
          issueId: issue.id,
          actorId,
          kind: "FIELD_CHANGED" as const,
          field: c.field,
          fromValue: c.from,
          toValue: c.to,
        })),
      });
    }

    if (changes.some((c) => c.field === "assignee")) {
      await notify(tx, { userIds: [patch.assigneeId], actorId, issueId: issue.id, type: "ASSIGNED" });
    }
    if (statusChanged) {
      await notify(tx, {
        userIds: [issue.reporterId, patch.assigneeId !== undefined ? patch.assigneeId : issue.assigneeId],
        actorId,
        issueId: issue.id,
        type: "STATUS_CHANGED",
      });
    }
  });
}

export async function updateIssue(issueId: string, input: unknown): Promise<ActionResult> {
  return run(async () => {
    const issue = await loadIssue(issueId);
    const { user } = await authorizeProject(issue.projectId, "issue:write");
    await applyPatch(issue, issuePatchSchema.parse(input), user.id);
    refresh(issue.project.key, issue.number);
    return undefined;
  });
}

/**
 * Board drag-and-drop: moves an issue into `status` between two neighbours
 * (ids of the cards that will sit directly above and below it).
 */
export async function moveIssue(
  issueId: string,
  status: Status,
  beforeId: string | null,
  afterId: string | null,
): Promise<ActionResult> {
  return run(async () => {
    const issue = await loadIssue(issueId);
    const { user } = await authorizeProject(issue.projectId, "issue:write");
    const target = z.enum(STATUSES).parse(status);

    const neighbours = await prisma.issue.findMany({
      where: { id: { in: [beforeId, afterId].filter((x): x is string => Boolean(x)) }, projectId: issue.projectId, status: target },
      select: { id: true, position: true },
    });
    const before = neighbours.find((n) => n.id === beforeId)?.position ?? null;
    const after = neighbours.find((n) => n.id === afterId)?.position ?? null;

    if (needsRebalance(before, after)) {
      // Precision exhausted: renumber the column, then retry the midpoint.
      const column = await prisma.issue.findMany({
        where: { projectId: issue.projectId, status: target, id: { not: issue.id } },
        orderBy: { position: "asc" },
        select: { id: true },
      });
      const spread = spreadPositions(column.length);
      await prisma.$transaction(column.map((c, i) => prisma.issue.update({ where: { id: c.id }, data: { position: spread[i] } })));
      const bi = column.findIndex((c) => c.id === beforeId);
      const ai = column.findIndex((c) => c.id === afterId);
      await applyPatch(issue, { status: target }, user.id, {
        position: positionBetween(bi >= 0 ? spread[bi] : null, ai >= 0 ? spread[ai] : null),
      });
    } else {
      await applyPatch(issue, { status: target }, user.id, { position: positionBetween(before, after) });
    }

    refresh(issue.project.key, issue.number);
    return undefined;
  });
}

const bulkSchema = z.object({
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assigneeId: z.string().nullable().optional(),
});

export async function bulkUpdateIssues(projectId: string, issueIds: string[], input: unknown): Promise<ActionResult<{ count: number }>> {
  return run(async () => {
    const { user } = await authorizeProject(projectId, "issue:write");
    const patch = bulkSchema.parse(input);
    const ids = z.array(z.string()).min(1).max(100).parse(issueIds);
    const issues = await prisma.issue.findMany({
      where: { id: { in: ids }, projectId },
      include: { labels: { select: { id: true } }, project: { select: { key: true } } },
    });
    for (const issue of issues) await applyPatch(issue, patch, user.id);
    if (issues[0]) refresh(issues[0].project.key);
    return { count: issues.length };
  });
}

// ─── Delete ───────────────────────────────────────────────────────────

function canDelete(role: Role, userId: string, reporterId: string | null) {
  return can(role, "issue:delete") || (can(role, "issue:write") && reporterId === userId);
}

export async function deleteIssues(projectId: string, issueIds: string[]): Promise<ActionResult<{ count: number }>> {
  return run(async () => {
    const { user, role } = await authorizeProject(projectId, "issue:write");
    const ids = z.array(z.string()).min(1).max(100).parse(issueIds);
    const issues = await prisma.issue.findMany({
      where: { id: { in: ids }, projectId },
      select: { id: true, reporterId: true, project: { select: { key: true } } },
    });
    const allowed = issues.filter((i) => canDelete(role, user.id, i.reporterId));
    if (allowed.length < issues.length) {
      throw new ActionError("Only admins can delete issues reported by someone else.");
    }
    await prisma.issue.deleteMany({ where: { id: { in: allowed.map((i) => i.id) } } });
    if (issues[0]) refresh(issues[0].project.key);
    return { count: allowed.length };
  });
}

// ─── Comments ─────────────────────────────────────────────────────────

export async function addComment(issueId: string, input: unknown): Promise<ActionResult> {
  return run(async () => {
    const issue = await loadIssue(issueId);
    const { user } = await authorizeProject(issue.projectId, "issue:comment");
    const { body } = commentSchema.parse(input);

    const members = await prisma.projectMember.findMany({
      where: { projectId: issue.projectId },
      select: { user: { select: { id: true, email: true } } },
    });
    const mentioned = resolveMentions(extractMentions(body), members.map((m) => m.user)).map((u) => u.id);

    await prisma.$transaction(async (tx) => {
      await tx.comment.create({ data: { issueId, authorId: user.id, body } });
      if (!issue.firstResponseAt && issue.reporterId !== user.id) {
        await tx.issue.update({ where: { id: issueId }, data: { firstResponseAt: new Date() } });
      }
      await tx.activity.create({ data: { issueId, actorId: user.id, kind: "COMMENTED" } });
      await notify(tx, { userIds: mentioned, actorId: user.id, issueId, type: "MENTIONED" });
      await notify(tx, {
        userIds: [issue.assigneeId, issue.reporterId].filter((id) => id && !mentioned.includes(id)),
        actorId: user.id,
        issueId,
        type: "COMMENTED",
      });
    });
    refresh(issue.project.key, issue.number);
    return undefined;
  });
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  return run(async () => {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { issue: { select: { projectId: true, number: true, project: { select: { key: true } } } } },
    });
    if (!comment) throw new ActionError("Comment not found.");
    const { user, role } = await authorizeProject(comment.issue.projectId, "project:view");
    if (comment.authorId !== user.id && !can(role, "project:manage")) {
      throw new ActionError("You can only delete your own comments.");
    }
    await prisma.comment.delete({ where: { id: commentId } });
    refresh(comment.issue.project.key, comment.issue.number);
    return undefined;
  });
}

export async function editComment(commentId: string, input: unknown): Promise<ActionResult> {
  return run(async () => {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { issue: { select: { projectId: true, number: true, project: { select: { key: true } } } } },
    });
    if (!comment) throw new ActionError("Comment not found.");
    const { user } = await authorizeProject(comment.issue.projectId, "issue:comment");
    if (comment.authorId !== user.id) throw new ActionError("You can only edit your own comments.");
    const { body } = commentSchema.parse(input);
    await prisma.comment.update({ where: { id: commentId }, data: { body } });
    refresh(comment.issue.project.key, comment.issue.number);
    return undefined;
  });
}

/** Issues in one project matching a title or number, for the parent picker. */
export async function findProjectIssues(projectId: string, q: string) {
  const user = await currentUser();
  if (!user) return [];
  const member = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: user.id } } });
  if (!member) return [];
  const query = q.trim().slice(0, 100);
  const asNumber = /^#?\d+$/.test(query) ? Number(query.replace("#", "")) : null;
  return prisma.issue.findMany({
    where: {
      projectId,
      ...(query
        ? { OR: [{ title: { contains: query, mode: "insensitive" } }, ...(asNumber ? [{ number: asNumber }] : [])] }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 8,
    select: { id: true, number: true, title: true, status: true },
  });
}

// ─── Search (command palette) ─────────────────────────────────────────

export type SearchHit = { key: string; number: number; title: string; status: Status; projectName: string; color: string };

export async function searchIssues(q: string): Promise<SearchHit[]> {
  const user = await currentUser();
  const query = q.trim().slice(0, 100);
  if (!user || query.length < 2) return [];

  const key = parseIssueKey(query);
  const issues = await prisma.issue.findMany({
    where: {
      project: { members: { some: { userId: user.id } } },
      OR: key
        ? [{ project: { key: key.key }, number: key.number }]
        : [{ title: { contains: query, mode: "insensitive" } }],
    },
    orderBy: { updatedAt: "desc" },
    take: 8,
    select: { number: true, title: true, status: true, project: { select: { key: true, name: true, color: true } } },
  });
  return issues.map((i) => ({
    key: i.project.key,
    number: i.number,
    title: i.title,
    status: i.status,
    projectName: i.project.name,
    color: i.project.color,
  }));
}

// ─── Notifications ────────────────────────────────────────────────────

export async function markNotificationsRead(ids: string[] | "all"): Promise<ActionResult> {
  return run(async () => {
    const user = await currentUser();
    if (!user) throw new ActionError("You need to sign in again.");
    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null, ...(ids === "all" ? {} : { id: { in: ids } }) },
      data: { readAt: new Date() },
    });
    revalidatePath("/", "layout");
    return undefined;
  });
}

// ─── Preview pane ─────────────────────────────────────────────────────

/** Everything the list's side preview shows for one issue. */
export async function getIssuePreview(issueId: string) {
  return run(async () => {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        assignee: { select: { id: true, name: true } },
        reporter: { select: { name: true } },
        labels: { select: { id: true, name: true, color: true }, orderBy: { name: "asc" } },
        children: { select: { status: true } },
        comments: {
          orderBy: { createdAt: "desc" },
          take: 3,
          select: { id: true, body: true, createdAt: true, author: { select: { name: true } } },
        },
        _count: { select: { comments: true } },
      },
    });
    if (!issue) throw new ActionError("Issue not found.");
    await authorizeProject(issue.projectId, "project:view");
    const targets = await prisma.slaTarget.findMany({ where: { projectId: issue.projectId } });
    return {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      description: issue.description,
      status: issue.status as Status,
      priority: issue.priority,
      type: issue.type,
      assigneeId: issue.assigneeId,
      assigneeName: issue.assignee?.name ?? null,
      reporterName: issue.reporter?.name ?? null,
      labels: issue.labels,
      dueDate: issue.dueDate,
      estimate: issue.estimate,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      children: { total: issue.children.length, done: issue.children.filter((c) => c.status === "DONE" || c.status === "CANCELED").length },
      comments: issue.comments.reverse(),
      commentCount: issue._count.comments,
      sla: evaluateSla(issue, targetsFromRows(targets)),
    };
  });
}

export type IssuePreviewData = Extract<Awaited<ReturnType<typeof getIssuePreview>>, { ok: true }>["data"];
