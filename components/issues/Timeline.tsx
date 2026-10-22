import { AlertOctagon, CirclePlus, Repeat } from "lucide-react";
import { PRIORITY_META, STATUS_META, TYPE_META, type IssueKind, type Priority, type Status } from "@/lib/constants";
import { Avatar, Markdown, TimeAgo } from "@/components/ui/bits";
import DeleteCommentButton from "@/components/issues/DeleteCommentButton";

export type TimelineEntry =
  | {
      kind: "activity";
      id: string;
      createdAt: Date;
      actor: string | null;
      activity: { kind: string; field: string | null; from: string | null; to: string | null };
    }
  | { kind: "comment"; id: string; createdAt: Date; actor: string | null; body: string; canDelete: boolean };

type Names = Record<string, string>;

function describe(a: { kind: string; field: string | null; from: string | null; to: string | null }, actor: string | null, users: Names, labels: Names) {
  const b = (s: React.ReactNode) => <span className="font-medium text-fg">{s}</span>;
  switch (a.kind) {
    case "CREATED":
      return <>created the issue</>;
    case "REGRESSED":
      return <>reopened automatically: the error {b("happened again")} after it was resolved</>;
    case "OCCURRED":
      return <>recorded another occurrence</>;
  }
  const status = (v: string | null) => (v ? STATUS_META[v as Status]?.label ?? v : "none");
  const priority = (v: string | null) => (v ? PRIORITY_META[v as Priority]?.label ?? v : "none");
  switch (a.field) {
    case "status":
      return <>moved from {b(status(a.from))} to {b(status(a.to))}</>;
    case "priority":
      return <>set priority to {b(priority(a.to))}</>;
    case "type":
      return <>changed type to {b(a.to ? TYPE_META[a.to as IssueKind]?.label : "none")}</>;
    case "assignee":
      if (!a.to) return <>removed the assignee</>;
      return users[a.to] === actor ? <>self-assigned</> : <>assigned {b(users[a.to] ?? "a former member")}</>;
    case "title":
      return <>renamed to {b(a.to)}</>;
    case "description":
      return <>edited the description</>;
    case "dueDate":
      return a.to ? <>set the due date to {b(a.to)}</> : <>cleared the due date</>;
    case "estimate":
      return a.to ? <>estimated {b(`${a.to} pts`)}</> : <>cleared the estimate</>;
    case "labels": {
      const from = new Set(a.from?.split(",").filter(Boolean));
      const to = new Set(a.to?.split(",").filter(Boolean));
      const added = [...to].filter((id) => !from.has(id)).map((id) => labels[id] ?? "deleted label");
      const removed = [...from].filter((id) => !to.has(id)).map((id) => labels[id] ?? "deleted label");
      return (
        <>
          {added.length > 0 && <>added {b(added.join(", "))}</>}
          {added.length > 0 && removed.length > 0 && " and "}
          {removed.length > 0 && <>removed {b(removed.join(", "))}</>}
        </>
      );
    }
    default:
      return <>updated {a.field}</>;
  }
}

export default function Timeline({ entries, userNames, labelNames }: { entries: TimelineEntry[]; userNames: Names; labelNames: Names }) {
  return (
    <ol className="relative flex flex-col gap-4 before:absolute before:bottom-2 before:left-[9px] before:top-2 before:w-px before:bg-line">
      {entries.map((e) =>
        e.kind === "comment" ? (
          <li key={e.id} className="relative flex gap-3">
            <Avatar name={e.actor ?? "Deleted user"} size={20} className="relative ring-4 ring-bg" />
            <div className="card min-w-0 flex-1">
              <div className="flex items-center gap-2 border-b border-line px-3 py-1.5 text-xs">
                <span className="font-medium">{e.actor ?? "Deleted user"}</span>
                <span className="text-faint"><TimeAgo date={e.createdAt} /></span>
                {e.canDelete && <DeleteCommentButton commentId={e.id} />}
              </div>
              <div className="px-3 py-2.5">
                <Markdown>{e.body}</Markdown>
              </div>
            </div>
          </li>
        ) : (
          <li key={e.id} className="relative flex items-center gap-3 text-xs text-muted">
            <span className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg">
              {e.activity.kind === "CREATED" ? (
                <CirclePlus className="h-3.5 w-3.5 text-faint" />
              ) : e.activity.kind === "REGRESSED" ? (
                <AlertOctagon className="h-3.5 w-3.5 text-danger" />
              ) : e.activity.kind === "OCCURRED" ? (
                <Repeat className="h-3.5 w-3.5 text-faint" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />
              )}
            </span>
            <p className="min-w-0 flex-1">
              <span className="font-medium text-fg">{e.actor ?? (e.activity.kind === "REGRESSED" || e.activity.kind === "CREATED" ? "Ingestion API" : "Someone")}</span>{" "}
              {describe(e.activity, e.actor, userNames, labelNames)}
              <span className="text-faint"> · <TimeAgo date={e.createdAt} /></span>
            </p>
          </li>
        ),
      )}
    </ol>
  );
}
