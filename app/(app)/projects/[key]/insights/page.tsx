import type { Metadata } from "next";
import Link from "next/link";
import { Repeat } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireProject } from "@/lib/access";
import { projectMembers } from "@/lib/queries";
import { countBy, formatDuration, isOverdue, medianResolutionHours, throughput } from "@/lib/analytics";
import { OPEN_STATUSES, PRIORITIES, PRIORITY_META, STATUSES, STATUS_META, issueKey, type Priority, type Status } from "@/lib/constants";
import ThroughputChart from "@/components/charts/ThroughputChart";
import BarList from "@/components/charts/BarList";
import StatTile from "@/components/charts/StatTile";
import { Avatar, TimeAgo } from "@/components/ui/bits";
import { PriorityIcon, StatusIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Insights" };

const WINDOW = 30;

export default async function InsightsPage({ params }: PageProps<"/projects/[key]/insights">) {
  const { key } = await params;
  const { project } = await requireProject(key);

  const [facts, members, recurring] = await Promise.all([
    prisma.issue.findMany({
      where: { projectId: project.id },
      select: { createdAt: true, closedAt: true, status: true, priority: true, assigneeId: true, dueDate: true },
    }),
    projectMembers(project.id),
    prisma.issue.findMany({
      where: { projectId: project.id, source: "API" },
      orderBy: [{ occurrences: "desc" }, { lastSeenAt: "desc" }],
      take: 5,
      select: { number: true, title: true, status: true, occurrences: true, lastSeenAt: true },
    }),
  ]);

  const now = new Date();
  const open = facts.filter((f) => (OPEN_STATUSES as readonly string[]).includes(f.status));
  const points = throughput(facts, WINDOW, now);
  const created = points.reduce((s, p) => s + p.created, 0);
  const resolved = points.reduce((s, p) => s + p.resolved, 0);
  const overdue = open.filter((f) => isOverdue(f, now)).length;
  const byStatus = countBy(facts, (f) => f.status as Status);
  const byPriority = countBy(open, (f) => f.priority as Priority);
  const byAssignee = countBy(open, (f) => f.assigneeId ?? "none");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Open issues" value={open.length} detail={`${facts.length} total`} />
        <StatTile label={`Net flow, ${WINDOW}d`} value={`${created - resolved > 0 ? "+" : ""}${created - resolved}`} detail={`${created} created · ${resolved} resolved`} />
        <StatTile label="Median time to resolve" value={formatDuration(medianResolutionHours(facts, WINDOW, now))} detail={`Issues closed in the last ${WINDOW} days`} />
        <StatTile label="Overdue" value={overdue} tone={overdue > 0 ? "danger" : undefined} detail="Open and past their due date" />
      </div>

      <section className="card p-4 sm:p-5">
        <h2 className="mb-4 text-[13px] font-semibold">Created vs resolved · last {WINDOW} days</h2>
        <ThroughputChart points={points} />
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="card p-4 sm:p-5">
          <h2 className="mb-4 text-[13px] font-semibold">All issues by status</h2>
          <BarList
            items={STATUSES.map((s) => ({
              key: s, label: STATUS_META[s].label, value: byStatus.get(s) ?? 0, color: STATUS_META[s].color, icon: <StatusIcon status={s} />,
            }))}
          />
        </section>
        <section className="card p-4 sm:p-5">
          <h2 className="mb-4 text-[13px] font-semibold">Open issues by priority</h2>
          <BarList
            items={PRIORITIES.map((p) => ({ key: p, label: PRIORITY_META[p].label, value: byPriority.get(p) ?? 0, icon: <PriorityIcon priority={p} /> }))}
          />
        </section>
        <section className="card p-4 sm:p-5">
          <h2 className="mb-4 text-[13px] font-semibold">Open workload by assignee</h2>
          <BarList
            items={[
              ...members.map((m) => ({ key: m.user.id, label: m.user.name, value: byAssignee.get(m.user.id) ?? 0, icon: <Avatar name={m.user.name} size={16} /> })),
              { key: "none", label: "Unassigned", value: byAssignee.get("none") ?? 0, icon: <Avatar name={null} size={16} /> },
            ].sort((a, b) => b.value - a.value)}
          />
        </section>
      </div>

      <section className="card p-4 sm:p-5">
        <h2 className="mb-1 text-[13px] font-semibold">Most frequent reported errors</h2>
        <p className="mb-3 text-xs text-muted">Issues opened through the ingestion API, ranked by how often they recur.</p>
        {recurring.length === 0 ? (
          <p className="py-4 text-xs text-faint">
            No API-reported issues yet. Create a key under <Link href={`/projects/${project.key}/settings#api`} className="text-accent hover:underline">Settings → API keys</Link>.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {recurring.map((r) => (
              <li key={r.number} className="flex items-center gap-3 py-2 text-[13px]">
                <StatusIcon status={r.status as Status} />
                <span className="w-16 shrink-0 font-mono text-xs text-faint">{issueKey(project.key, r.number)}</span>
                <Link href={`/projects/${project.key}/issues/${r.number}`} className="min-w-0 flex-1 truncate font-medium hover:text-accent">{r.title}</Link>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-danger"><Repeat className="h-3 w-3" />{r.occurrences}</span>
                {r.lastSeenAt && <span className="hidden w-20 text-right text-xs text-faint sm:block"><TimeAgo date={r.lastSeenAt} /></span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
