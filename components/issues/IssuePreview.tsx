"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowUpRight, CalendarClock, ListTree, MessageSquare, X } from "lucide-react";
import { getIssuePreview, updateIssue, type IssuePreviewData } from "@/actions/issues";
import { PRIORITY_META, STATUS_META, TYPE_META, issueKey, type IssueKind, type Priority, type Status } from "@/lib/constants";
import { Avatar, LabelChip, Markdown, TimeAgo, shortDate } from "@/components/ui/bits";
import { PriorityIcon, StatusIcon, TypeIcon } from "@/components/ui/icons";
import { Bone } from "@/components/Skeleton";
import Picker from "@/components/ui/Picker";
import { SlaClockRow } from "@/components/issues/SlaBadge";
import { assigneeOptions, priorityOptions, statusOptions, type MemberLite } from "@/components/ui/options";

type Props = {
  issueId: string;
  /** Changes when the list row changes, so the preview re-fetches after edits elsewhere. */
  version: number;
  projectKey: string;
  members: MemberLite[];
  meId: string;
  canEdit: boolean;
  onClose: () => void;
};

const trigger = "btn-secondary h-7 px-2 text-xs";

/**
 * Side panel showing one issue next to the list: properties you can change in
 * place, the description and the latest comments. Esc closes it.
 */
export default function IssuePreview({ issueId, version, projectKey, members, meId, canEdit, onClose }: Props) {
  const router = useRouter();
  const [data, setData] = useState<IssuePreviewData | null>(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    getIssuePreview(issueId).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setData(res.data);
        setError("");
      } else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [issueId, version]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("[role=listbox], dialog[open]")) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const patch = (local: Partial<IssuePreviewData>, server: Parameters<typeof updateIssue>[1]) => {
    if (!data) return;
    const snapshot = data;
    setData({ ...data, ...local });
    startTransition(async () => {
      const res = await updateIssue(issueId, server);
      if (!res.ok) {
        setData(snapshot);
        toast.error(res.error);
      } else router.refresh();
    });
  };

  const showing = data?.id === issueId ? data : null;

  return (
    <aside
      aria-label="Issue preview"
      className="animate-fade-up fixed inset-y-0 right-0 z-30 flex w-full max-w-[440px] flex-col border-l border-line bg-surface shadow-[var(--shadow-lg)]"
    >
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-4">
        <span className="font-mono text-xs text-faint">{showing ? issueKey(projectKey, showing.number) : "…"}</span>
        <div className="ml-auto flex items-center gap-1">
          {showing && (
            <Link href={`/projects/${projectKey}/issues/${showing.number}`} className="btn-ghost h-7 px-2 text-xs">
              Open <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}
          <button className="btn-icon h-7 w-7" onClick={onClose} aria-label="Close preview" title="Close (Esc)">
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {error ? (
          <p className="text-[13px] text-danger">{error}</p>
        ) : !showing ? (
          <div className="flex flex-col gap-3" role="status" aria-label="Loading">
            <Bone className="h-6 w-4/5" />
            <div className="flex gap-2">{[0, 1, 2].map((i) => <Bone key={i} className="h-7 w-24" />)}</div>
            {["w-full", "w-11/12", "w-3/4"].map((w) => <Bone key={w} className={`h-3.5 ${w}`} />)}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold leading-snug">{showing.title}</h2>

            <div className="flex flex-wrap items-center gap-1.5">
              <Picker label="Status" options={statusOptions} value={showing.status} disabled={!canEdit} triggerClassName={trigger}
                onChange={(v) => patch({ status: v as Status }, { status: v as Status })}>
                <StatusIcon status={showing.status} /> {STATUS_META[showing.status].label}
              </Picker>
              <Picker label="Priority" options={priorityOptions} value={showing.priority} disabled={!canEdit} triggerClassName={trigger}
                onChange={(v) => patch({ priority: v as Priority }, { priority: v as Priority })}>
                <PriorityIcon priority={showing.priority as Priority} /> {PRIORITY_META[showing.priority as Priority].label}
              </Picker>
              <Picker label="Assignee" options={assigneeOptions(members, meId)} value={showing.assigneeId ?? ""} disabled={!canEdit} triggerClassName={trigger} align="right"
                onChange={(v) => patch({ assigneeId: v || null, assigneeName: members.find((m) => m.id === v)?.name ?? null }, { assigneeId: v || null })}>
                <Avatar name={showing.assigneeName} size={16} /> {showing.assigneeName ?? "Unassigned"}
              </Picker>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <Fact label="Type"><TypeIcon type={showing.type as IssueKind} className="h-3 w-3" /> {TYPE_META[showing.type as IssueKind].label}</Fact>
              <Fact label="Reporter">{showing.reporterName ?? "API"}</Fact>
              {showing.dueDate && <Fact label="Due"><CalendarClock className="h-3 w-3" /> {shortDate(showing.dueDate)}</Fact>}
              {showing.estimate !== null && <Fact label="Estimate">{showing.estimate} pts</Fact>}
              {showing.children.total > 0 && (
                <Fact label="Sub-issues"><ListTree className="h-3 w-3" /> {showing.children.done}/{showing.children.total} done</Fact>
              )}
              <Fact label="Updated"><TimeAgo date={showing.updatedAt} /></Fact>
            </dl>

            {showing.labels.length > 0 && (
              <div className="flex flex-wrap gap-1">{showing.labels.map((l) => <LabelChip key={l.id} name={l.name} color={l.color} />)}</div>
            )}

            {(showing.sla.respond || showing.sla.resolve) && (
              <div className="flex flex-col gap-1 rounded-md border border-line p-2.5">
                <SlaClockRow label="Response" clock={showing.sla.respond} />
                <SlaClockRow label="Resolution" clock={showing.sla.resolve} />
              </div>
            )}

            <div className="border-t border-line pt-4">
              {showing.description.trim() ? <Markdown>{showing.description}</Markdown> : <p className="text-sm text-faint">No description.</p>}
            </div>

            <div className="border-t border-line pt-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
                <MessageSquare className="h-3.5 w-3.5" /> {showing.commentCount === 0 ? "No comments" : `Latest comments (${showing.commentCount})`}
              </h3>
              <ul className="flex flex-col gap-3">
                {showing.comments.map((c) => (
                  <li key={c.id} className="text-[13px]">
                    <p className="mb-1 flex items-center gap-1.5 text-xs">
                      <Avatar name={c.author?.name ?? "Deleted user"} size={16} />
                      <span className="font-medium">{c.author?.name ?? "Deleted user"}</span>
                      <span className="text-faint"><TimeAgo date={c.createdAt} /></span>
                    </p>
                    <div className="line-clamp-6"><Markdown>{c.body}</Markdown></div>
                  </li>
                ))}
              </ul>
              {showing.commentCount > showing.comments.length && (
                <Link href={`/projects/${projectKey}/issues/${showing.number}`} className="mt-2 inline-block text-xs text-accent hover:underline">
                  See the full conversation
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-faint">{label}</dt>
      <dd className="inline-flex items-center gap-1 text-muted">{children}</dd>
    </div>
  );
}
