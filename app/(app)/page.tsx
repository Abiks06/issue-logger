import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { CheckCircle2, FolderKanban, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/access";
import { issueRowSelect } from "@/lib/queries";
import { isOverdue, startOfDay } from "@/lib/analytics";
import { ONBOARDING_COOKIE, OPEN_STATUSES, STATUS_META, issueKey, type Priority, type Status } from "@/lib/constants";
import { Avatar, EmptyState, ProjectBadge, TimeAgo, shortDate } from "@/components/ui/bits";
import { PriorityIcon, StatusIcon } from "@/components/ui/icons";
import StatTile from "@/components/charts/StatTile";
import PageHeader from "@/components/PageHeader";
import { SlaBadge } from "@/components/issues/SlaBadge";
import { evaluateSla, targetsFromRows, type SlaTargets } from "@/lib/sla";
import AutoRefresh from "@/components/AutoRefresh";
import { OnboardingChecklist, SampleProjectButton, type OnboardingStep } from "@/components/Onboarding";

export const metadata: Metadata = { title: "My work" };

function greeting(now: Date) {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** Getting-started steps, or null once they're all done or the checklist was dismissed. */
async function onboardingSteps(userId: string): Promise<OnboardingStep[] | null> {
  if ((await cookies()).get(ONBOARDING_COOKIE)) return null;
  const mine = { members: { some: { userId } } };
  const [first, issue, teammate, invite, apiKey, webhook] = await Promise.all([
    prisma.project.findFirst({
      where: { members: { some: { userId, role: { in: ["OWNER", "ADMIN"] } } } },
      orderBy: { createdAt: "asc" },
      select: { key: true },
    }),
    prisma.issue.findFirst({ where: { project: mine }, select: { id: true } }),
    prisma.projectMember.findFirst({ where: { project: mine, userId: { not: userId } }, select: { id: true } }),
    prisma.projectInvite.findFirst({ where: { project: mine }, select: { id: true } }),
    prisma.apiKey.findFirst({ where: { project: mine }, select: { id: true } }),
    prisma.webhook.findFirst({ where: { project: mine }, select: { id: true } }),
  ]);
  const base = first ? `/projects/${first.key}` : "/projects";
  const steps: OnboardingStep[] = [
    { id: "project", label: "Create a project", detail: "A home for one product or team's issues.", href: "/projects/new", done: true },
    { id: "issue", label: "Log your first issue", detail: "Press C anywhere to create one.", href: first ? `${base}/issues/new` : base, done: Boolean(issue) },
    { id: "invite", label: "Invite a teammate", detail: "Share the work and assign issues.", href: `${base}/settings#members`, done: Boolean(teammate || invite) },
    { id: "connect", label: "Connect a service", detail: "Send errors in with an API key, or post updates to Slack.", href: `${base}/settings#api`, done: Boolean(apiKey || webhook) },
  ];
  return steps.every((s) => s.done) ? null : steps;
}

export default async function MyWorkPage() {
  const user = await requireUser();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const inAWeek = new Date(startOfDay(now).getTime() + 8 * 86_400_000);
  const myProjects = { members: { some: { userId: user.id } } };

  const [assigned, resolvedThisWeek, activity, projectCount, slaRows] = await Promise.all([
    prisma.issue.findMany({
      where: { assigneeId: user.id, status: { in: [...OPEN_STATUSES] }, project: myProjects },
      orderBy: [{ priority: "desc" }, { dueDate: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
      take: 100,
      select: { ...issueRowSelect, projectId: true, project: { select: { key: true, name: true, color: true } } },
    }),
    prisma.issue.count({ where: { assigneeId: user.id, closedAt: { gte: weekAgo }, status: "DONE" } }),
    prisma.activity.findMany({
      where: { issue: { project: myProjects }, kind: { in: ["CREATED", "COMMENTED", "REGRESSED", "FIELD_CHANGED"] }, OR: [{ field: null }, { field: "status" }] },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true, kind: true, field: true, toValue: true, createdAt: true,
        actor: { select: { name: true } },
        issue: { select: { number: true, title: true, project: { select: { key: true } } } },
      },
    }),
    prisma.project.count({ where: myProjects }),
    prisma.slaTarget.findMany({ where: { project: myProjects } }),
  ]);
  const onboarding = projectCount > 0 ? await onboardingSteps(user.id) : null;

  const targetsByProject = new Map<string, SlaTargets>();
  for (const row of slaRows) {
    targetsByProject.set(row.projectId, { ...targetsByProject.get(row.projectId), ...targetsFromRows([row]) });
  }
  const slaOf = (i: (typeof assigned)[number]) => evaluateSla(i, targetsByProject.get(i.projectId) ?? {}, now);
  const slaAttention = assigned.filter((i) => {
    const w = slaOf(i).live;
    return w === "at_risk" || w === "breached";
  });
  const overdue = assigned.filter((i) => isOverdue({ dueDate: i.dueDate, closedAt: null }, now));
  const dueSoon = assigned.filter((i) => i.dueDate && !isOverdue({ dueDate: i.dueDate, closedAt: null }, now) && i.dueDate < inAWeek);
  const groups = (["IN_REVIEW", "IN_PROGRESS", "TODO", "BACKLOG"] as Status[])
    .map((s) => ({ status: s, issues: assigned.filter((i) => i.status === s) }))
    .filter((g) => g.issues.length > 0);

  return (
    <>
      <AutoRefresh />
      <PageHeader title={`${greeting(now)}, ${user.name.split(" ")[0]}`} subtitle="Everything assigned to you across your projects." />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Assigned to me" value={assigned.length} detail={`${dueSoon.length} due in the next 7 days`} />
          <StatTile label="Overdue" value={overdue.length} tone={overdue.length ? "danger" : undefined} detail="Past their due date" />
          <StatTile label="SLA needs attention" value={slaAttention.length} tone={slaAttention.length ? "danger" : undefined} detail="Your issues at risk or breached" />
          <StatTile label="Done this week" value={resolvedThisWeek} detail="Closed by you or for you" />
        </div>

        {onboarding && <OnboardingChecklist steps={onboarding} />}

        {projectCount === 0 ? (
          <div className="card">
            <EmptyState icon={<FolderKanban className="h-5 w-5" />} title="Welcome to Issue Logger">
              Start by creating a project. You can invite teammates and connect your services afterwards.
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link href="/projects/new" className="btn-primary"><Plus className="h-4 w-4" /> Create a project</Link>
                <SampleProjectButton />
              </div>
              <p className="mt-3 text-xs text-faint">The sample project is filled with example issues so you can explore the board, SLAs and insights first.</p>
            </EmptyState>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section aria-labelledby="assigned-heading">
              <h2 id="assigned-heading" className="mb-3 text-[13px] font-semibold">Assigned to you</h2>
              {groups.length === 0 ? (
                <div className="card">
                  <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title="Inbox zero for issues">
                    Nothing is assigned to you right now.
                  </EmptyState>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {groups.map((g) => (
                    <div key={g.status} className="card overflow-hidden">
                      <div className="flex items-center gap-2 border-b border-line bg-surface-2/50 px-3 py-2 text-xs font-medium">
                        <StatusIcon status={g.status} /> {STATUS_META[g.status].label}
                        <span className="text-faint">{g.issues.length}</span>
                      </div>
                      <ul className="divide-y divide-line">
                        {g.issues.map((i) => {
                          const late = isOverdue({ dueDate: i.dueDate, closedAt: null }, now);
                          return (
                            <li key={i.id} className="flex items-center gap-3 px-3 py-2 hover:bg-surface-2/60">
                              <PriorityIcon priority={i.priority as Priority} />
                              <ProjectBadge projectKey={i.project.key} color={i.project.color} size={16} />
                              <span className="hidden w-16 shrink-0 font-mono text-xs text-faint sm:block">{issueKey(i.project.key, i.number)}</span>
                              <Link href={`/projects/${i.project.key}/issues/${i.number}`} className="min-w-0 flex-1 truncate text-[13px] font-medium hover:text-accent">
                                {i.title}
                              </Link>
                              <SlaBadge sla={slaOf(i)} />
                              {i.dueDate && (
                                <span className={`text-[11px] ${late ? "font-medium text-danger" : "text-faint"}`}>
                                  {late ? "Overdue · " : "Due "}{shortDate(i.dueDate)}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="recent-heading">
              <h2 id="recent-heading" className="mb-3 text-[13px] font-semibold">Recent activity</h2>
              <ul className="card divide-y divide-line">
                {activity.length === 0 && <li className="p-4 text-xs text-faint">No activity yet.</li>}
                {activity.map((a) => (
                  <li key={a.id} className="flex gap-2.5 px-3 py-2.5">
                    <Avatar name={a.actor?.name ?? "API"} size={20} />
                    <div className="min-w-0 text-xs">
                      <p className="text-muted">
                        <span className="font-medium text-fg">{a.actor?.name ?? "Ingestion API"}</span>{" "}
                        {a.kind === "CREATED" ? "created" : a.kind === "COMMENTED" ? "commented on" : a.kind === "REGRESSED" ? "reopened (regression)" : `moved to ${STATUS_META[a.toValue as Status]?.label ?? a.toValue}:`}
                      </p>
                      <Link href={`/projects/${a.issue.project.key}/issues/${a.issue.number}`} className="block truncate font-medium text-fg hover:text-accent">
                        <span className="font-mono text-faint">{issueKey(a.issue.project.key, a.issue.number)}</span> {a.issue.title}
                      </Link>
                      <p className="text-faint"><TimeAgo date={a.createdAt} /></p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </>
  );
}
