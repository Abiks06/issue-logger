import Link from "next/link";
import { CalendarClock, MessageSquare, Repeat } from "lucide-react";
import type { IssueRow } from "@/lib/queries";
import type { IssueKind, Priority } from "@/lib/constants";
import { isOverdue } from "@/lib/analytics";
import { Avatar, LabelChip, shortDate } from "@/components/ui/bits";
import { PriorityIcon, TypeIcon } from "@/components/ui/icons";

/** Board card. Rendered inside the client board, so it must stay hook-free. */
export default function IssueCard({ issue, projectKey, dragging }: { issue: IssueRow; projectKey: string; dragging?: boolean }) {
  const closed = issue.status === "DONE" || issue.status === "CANCELED";
  const overdue = !closed && isOverdue({ dueDate: issue.dueDate, closedAt: null });
  return (
    <Link
      href={`/projects/${projectKey}/issues/${issue.number}`}
      draggable={false}
      className={`card block p-3 transition-[box-shadow,border-color,opacity] hover:border-line-strong ${dragging ? "opacity-40" : ""}`}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-faint">
        <TypeIcon type={issue.type as IssueKind} className="h-3 w-3" />
        <span className="font-mono">{projectKey}-{issue.number}</span>
        {issue.source === "API" && issue.occurrences > 1 && (
          <span className="ml-auto inline-flex items-center gap-0.5 rounded bg-danger-soft px-1 font-medium text-danger" title="Occurrences">
            <Repeat className="h-2.5 w-2.5" />
            {issue.occurrences}
          </span>
        )}
      </div>
      <p className="mt-1 line-clamp-3 text-[13px] font-medium leading-snug text-fg">{issue.title}</p>
      {issue.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {issue.labels.slice(0, 3).map((l) => <LabelChip key={l.id} name={l.name} color={l.color} />)}
          {issue.labels.length > 3 && <span className="text-[11px] text-faint">+{issue.labels.length - 3}</span>}
        </div>
      )}
      <div className="mt-2.5 flex items-center gap-2 text-[11px] text-faint">
        <PriorityIcon priority={issue.priority as Priority} />
        {issue.dueDate && (
          <span className={`inline-flex items-center gap-1 ${overdue ? "font-medium text-danger" : ""}`}>
            <CalendarClock className="h-3 w-3" />
            {shortDate(issue.dueDate)}
          </span>
        )}
        {issue._count.comments > 0 && (
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {issue._count.comments}
          </span>
        )}
        <span className="ml-auto">
          <Avatar name={issue.assignee?.name} size={18} />
        </span>
      </div>
    </Link>
  );
}
