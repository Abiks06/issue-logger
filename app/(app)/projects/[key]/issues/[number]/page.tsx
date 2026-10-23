import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { projectAccess, requireProject } from "@/lib/access";
import { can } from "@/lib/permissions";
import { projectLabels, projectMembers, projectSlaTargets } from "@/lib/queries";
import { evaluateSla } from "@/lib/sla";
import { handleFor, issueKey } from "@/lib/constants";
import SubIssues from "@/components/issues/SubIssues";
import AutoRefresh from "@/components/AutoRefresh";
import IssueEditor from "@/components/issues/IssueEditor";
import IssueProperties from "@/components/issues/IssueProperties";
import Timeline, { type TimelineEntry } from "@/components/issues/Timeline";
import CommentComposer from "@/components/issues/CommentComposer";

function parseNumber(raw: string) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 && n < 2 ** 31 ? n : null;
}

export async function generateMetadata({ params }: PageProps<"/projects/[key]/issues/[number]">): Promise<Metadata> {
  const { key, number } = await params;
  const access = await projectAccess(key);
  const n = parseNumber(number);
  if (!access || !n) return { title: "Issue" };
  const issue = await prisma.issue.findUnique({
    where: { projectId_number: { projectId: access.project.id, number: n } },
    select: { title: true },
  });
  return { title: issue ? `${issueKey(access.project.key, n)} ${issue.title}` : "Issue" };
}

export default async function IssuePage({ params }: PageProps<"/projects/[key]/issues/[number]">) {
  const { key, number } = await params;
  const { project, role, user } = await requireProject(key);
  const n = parseNumber(number);
  if (!n) notFound();

  const issue = await prisma.issue.findUnique({
    where: { projectId_number: { projectId: project.id, number: n } },
    include: {
      assignee: { select: { id: true, name: true } },
      reporter: { select: { id: true, name: true } },
      labels: { select: { id: true, name: true, color: true }, orderBy: { name: "asc" } },
      comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true } } } },
      activities: { orderBy: { createdAt: "asc" }, include: { actor: { select: { name: true } } } },
      parent: { select: { id: true, number: true, title: true, status: true } },
      children: {
        orderBy: [{ status: "asc" }, { number: "asc" }],
        select: { id: true, number: true, title: true, status: true, priority: true, assignee: { select: { name: true } } },
      },
    },
  });
  if (!issue) notFound();

  const [members, labels, slaTargets] = await Promise.all([projectMembers(project.id), projectLabels(project.id), projectSlaTargets(project.id)]);
  const canEdit = can(role, "issue:write");

  // Opening an issue clears its notifications for this user.
  await prisma.notification.updateMany({
    where: { userId: user.id, issueId: issue.id, readAt: null },
    data: { readAt: new Date() },
  });

  // Names for ids recorded in the activity log, including people who have since left.
  const referencedUserIds = issue.activities.flatMap((a) => (a.field === "assignee" ? [a.fromValue, a.toValue] : [])).filter(Boolean) as string[];
  const formerUsers = await prisma.user.findMany({
    where: { id: { in: referencedUserIds.filter((id) => !members.some((m) => m.user.id === id)) } },
    select: { id: true, name: true },
  });
  const userNames = Object.fromEntries([...members.map((m) => [m.user.id, m.user.name]), ...formerUsers.map((u) => [u.id, u.name])]);
  const labelNames = Object.fromEntries(labels.map((l) => [l.id, l.name]));
  const parentIds = issue.activities.flatMap((a) => (a.field === "parent" ? [a.fromValue, a.toValue] : [])).filter(Boolean) as string[];
  const referencedIssues = parentIds.length
    ? await prisma.issue.findMany({ where: { id: { in: parentIds } }, select: { id: true, number: true } })
    : [];
  const issueNames = Object.fromEntries(referencedIssues.map((i) => [i.id, issueKey(project.key, i.number)]));
  const mentions = members.map((m) => ({ name: m.user.name, handle: handleFor(m.user.email) }));

  const timeline: TimelineEntry[] = [
    ...issue.activities
      .filter((a) => a.kind !== "COMMENTED")
      .map((a) => ({
        kind: "activity" as const,
        id: a.id,
        createdAt: a.createdAt,
        actor: a.actor?.name ?? null,
        activity: { kind: a.kind, field: a.field, from: a.fromValue, to: a.toValue },
      })),
    ...issue.comments.map((c) => ({
      kind: "comment" as const,
      id: c.id,
      createdAt: c.createdAt,
      actor: c.author?.name ?? null,
      body: c.body,
      // Prisma bumps updatedAt on create too, so allow a second of slack.
      edited: c.updatedAt.getTime() - c.createdAt.getTime() > 1000,
      canEdit: c.authorId === user.id && can(role, "issue:comment"),
      canDelete: c.authorId === user.id || can(role, "project:manage"),
    })),
  ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:flex-row">
      <AutoRefresh />
      <div className="min-w-0 flex-1">
        <nav className="mb-3 flex items-center gap-1 text-xs text-faint" aria-label="Breadcrumb">
          <Link href={`/projects/${project.key}/issues`} className="hover:text-fg">{project.name}</Link>
          <ChevronRight className="h-3 w-3" />
          {issue.parent && (
            <>
              <Link href={`/projects/${project.key}/issues/${issue.parent.number}`} className="max-w-60 truncate hover:text-fg" title={issue.parent.title}>
                <span className="font-mono">{issueKey(project.key, issue.parent.number)}</span> {issue.parent.title}
              </Link>
              <ChevronRight className="h-3 w-3" />
            </>
          )}
          <span className="font-mono">{issueKey(project.key, issue.number)}</span>
        </nav>

        <IssueEditor issueId={issue.id} title={issue.title} description={issue.description} canEdit={canEdit} mentions={mentions} />

        <SubIssues
          projectId={project.id}
          projectKey={project.key}
          parentId={issue.id}
          items={issue.children.map((c) => ({ ...c, assignee: c.assignee?.name ?? null }))}
          canEdit={canEdit}
        />

        <section className="mt-10" aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="mb-4 text-[13px] font-semibold">Activity</h2>
          <Timeline entries={timeline} userNames={userNames} labelNames={labelNames} issueNames={issueNames} mentions={mentions} />
          {can(role, "issue:comment") ? (
            <CommentComposer issueId={issue.id} mentions={mentions} />
          ) : (
            <p className="mt-4 text-xs text-faint">Viewers can read but not comment.</p>
          )}
        </section>
      </div>

      <IssueProperties
        projectId={project.id}
        projectKey={project.key}
        issue={{
          id: issue.id,
          status: issue.status,
          priority: issue.priority,
          type: issue.type,
          assigneeId: issue.assigneeId,
          labelIds: issue.labels.map((l) => l.id),
          dueDate: issue.dueDate,
          estimate: issue.estimate,
          reporter: issue.reporter?.name ?? null,
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
          closedAt: issue.closedAt,
          source: issue.source,
          occurrences: issue.occurrences,
          lastSeenAt: issue.lastSeenAt,
          environment: issue.environment,
          number: issue.number,
          title: issue.title,
          parent: issue.parent,
          childCount: issue.children.length,
        }}
        members={members.map((m) => m.user)}
        labels={labels}
        meId={user.id}
        canEdit={canEdit}
        canDelete={can(role, "issue:delete") || (canEdit && issue.reporterId === user.id)}
        sla={evaluateSla(issue, slaTargets)}
      />
    </div>
  );
}
