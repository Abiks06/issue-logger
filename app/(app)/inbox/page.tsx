import type { Metadata } from "next";
import Link from "next/link";
import { AlertOctagon, AtSign, CircleDot, Inbox, MessageSquare, UserPlus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/access";
import { issueKey, STATUS_META, type Status } from "@/lib/constants";
import { EmptyState, TimeAgo } from "@/components/ui/bits";
import PageHeader from "@/components/PageHeader";
import AutoRefresh from "@/components/AutoRefresh";
import MarkAllRead from "./MarkAllRead";

export const metadata: Metadata = { title: "Inbox" };

const TYPE_UI = {
  ASSIGNED: { icon: UserPlus, verb: "assigned you" },
  COMMENTED: { icon: MessageSquare, verb: "commented on" },
  MENTIONED: { icon: AtSign, verb: "mentioned you on" },
  STATUS_CHANGED: { icon: CircleDot, verb: "changed the status of" },
  REGRESSED: { icon: AlertOctagon, verb: "reopened" },
} as const;

export default async function InboxPage() {
  const user = await requireUser();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, type: true, readAt: true, createdAt: true,
      actor: { select: { name: true } },
      issue: { select: { number: true, title: true, status: true, project: { select: { key: true, name: true } } } },
    },
  });
  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <>
      <AutoRefresh />
      <PageHeader title="Inbox" subtitle={unread ? `${unread} unread` : "You're all caught up"}>
        {unread > 0 && <MarkAllRead />}
      </PageHeader>
      <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
        {notifications.length === 0 ? (
          <div className="card">
            <EmptyState icon={<Inbox className="h-5 w-5" />} title="No notifications">
              You&apos;ll hear about assignments, mentions, comments on your issues and regressions here.
            </EmptyState>
          </div>
        ) : (
          <ul className="card divide-y divide-line overflow-hidden">
            {notifications.map((n) => {
              const { icon: Icon, verb } = TYPE_UI[n.type];
              const key = issueKey(n.issue.project.key, n.issue.number);
              return (
                <li key={n.id}>
                  <Link
                    href={`/projects/${n.issue.project.key}/issues/${n.issue.number}`}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-surface-2/60 ${n.readAt ? "" : "bg-accent-soft/50"}`}
                  >
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${n.type === "REGRESSED" ? "bg-danger-soft text-danger" : "bg-surface-2 text-muted"}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-muted">
                        <span className="font-medium text-fg">{n.actor?.name ?? (n.type === "REGRESSED" ? "Ingestion API" : "Someone")}</span> {verb}{" "}
                        <span className="font-mono text-xs">{key}</span>
                        {n.type === "STATUS_CHANGED" && <> → {STATUS_META[n.issue.status as Status].label}</>}
                      </p>
                      <p className="truncate text-[13px] font-medium text-fg">{n.issue.title}</p>
                      <p className="text-[11px] text-faint">{n.issue.project.name} · <TimeAgo date={n.createdAt} /></p>
                    </div>
                    {!n.readAt && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
