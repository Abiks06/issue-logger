"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CalendarClock, ListX, MessageSquare, Repeat, Trash2, X } from "lucide-react";
import { bulkUpdateIssues, deleteIssues } from "@/actions/issues";
import type { IssueRow } from "@/lib/queries";
import { isOverdue } from "@/lib/analytics";
import { evaluateSla, type SlaTargets } from "@/lib/sla";
import { SlaBadge } from "@/components/issues/SlaBadge";
import type { IssueKind, Priority, Status } from "@/lib/constants";
import { Avatar, EmptyState, LabelChip, TimeAgo, shortDate } from "@/components/ui/bits";
import { PriorityIcon, StatusIcon, TypeIcon } from "@/components/ui/icons";
import Picker from "@/components/ui/Picker";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { assigneeOptions, priorityOptions, statusOptions, type MemberLite } from "@/components/ui/options";

type Props = {
  projectId: string;
  projectKey: string;
  issues: IssueRow[];
  members: MemberLite[];
  meId: string;
  canEdit: boolean;
  canDeleteAny: boolean;
  total: number;
  filtered: boolean;
  slaTargets: SlaTargets;
};

export default function IssueTable({ projectId, projectKey, issues, members, meId, canEdit, canDeleteAny, total, filtered, slaTargets }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Keyboard cursor: j/k (or arrows) move, x selects, Enter opens.
  const [cursor, setCursor] = useState(-1);

  const allSelected = issues.length > 0 && selected.size === issues.length;
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const bulk = (patch: Parameters<typeof bulkUpdateIssues>[2], verb: string) =>
    startTransition(async () => {
      const res = await bulkUpdateIssues(projectId, [...selected], patch);
      if (!res.ok) return void toast.error(res.error);
      toast.success(`${verb} ${res.data.count} ${res.data.count === 1 ? "issue" : "issues"}`);
      setSelected(new Set());
      router.refresh();
    });

  const remove = async () => {
    const res = await deleteIssues(projectId, [...selected]);
    if (!res.ok) return void toast.error(res.error);
    toast.success(`Deleted ${res.data.count} ${res.data.count === 1 ? "issue" : "issues"}`);
    setSelected(new Set());
    router.refresh();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      if (document.querySelector("dialog[open], [role=listbox], [role=dialog]")) return;
      const max = issues.length - 1;
      if (e.key === "j" || e.key === "ArrowDown") setCursor((c) => Math.min(max, c + 1));
      else if (e.key === "k" || e.key === "ArrowUp") setCursor((c) => Math.max(0, c - 1));
      else if (e.key === "x" && cursor >= 0 && canEdit) toggle(issues[cursor].id);
      else if (e.key === "Enter" && cursor >= 0) router.push(`/projects/${projectKey}/issues/${issues[cursor].number}`);
      else if (e.key === "Escape" && selected.size) setSelected(new Set());
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (cursor >= 0) document.querySelector(`[data-row="${cursor}"]`)?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  if (issues.length === 0) {
    return (
      <div className="card m-4 sm:mx-6">
        <EmptyState icon={<ListX className="h-5 w-5" />} title={filtered ? "No issues match these filters" : "No issues yet"}>
          {filtered ? "Try removing a filter." : "Create one, or send errors from your services with an API key."}
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="relative px-4 pb-4 pt-3 sm:px-6">
      <div className="card overflow-hidden">
        <div className="flex h-9 items-center gap-3 border-b border-line bg-surface-2/50 px-3 text-xs text-faint">
          {canEdit && (
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-[var(--accent)]"
              checked={allSelected}
              onChange={() => setSelected(allSelected ? new Set() : new Set(issues.map((i) => i.id)))}
              aria-label="Select all on this page"
            />
          )}
          <span>{total} {total === 1 ? "issue" : "issues"}</span>
          <span className="ml-auto hidden items-center gap-1 lg:flex">
            <span className="kbd">J</span><span className="kbd">K</span> move <span className="kbd ml-1">X</span> select <span className="kbd ml-1">↵</span> open
          </span>
        </div>
        <ul>
          {issues.map((issue, index) => {
            const closed = issue.status === "DONE" || issue.status === "CANCELED";
            const overdue = !closed && isOverdue({ dueDate: issue.dueDate, closedAt: null });
            const checked = selected.has(issue.id);
            return (
              <li
                key={issue.id}
                data-row={index}
                onMouseEnter={() => setCursor(index)}
                className={`group relative flex items-center gap-3 border-b border-line px-3 py-2 last:border-0 hover:bg-surface-2/60 ${checked ? "bg-accent-soft" : ""} ${cursor === index ? "bg-surface-2/60 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent" : ""}`}
              >
                {canEdit && (
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 shrink-0 accent-[var(--accent)]"
                    checked={checked}
                    onChange={() => toggle(issue.id)}
                    aria-label={`Select ${projectKey}-${issue.number}`}
                  />
                )}
                <PriorityIcon priority={issue.priority as Priority} />
                <span className="hidden w-16 shrink-0 font-mono text-xs text-faint sm:block">{projectKey}-{issue.number}</span>
                <StatusIcon status={issue.status as Status} />
                <Link
                  href={`/projects/${projectKey}/issues/${issue.number}`}
                  className={`min-w-0 flex-1 truncate text-[13px] font-medium hover:text-accent ${issue.status === "CANCELED" ? "text-faint line-through" : ""}`}
                >
                  {issue.title}
                </Link>
                <div className="hidden items-center gap-1 lg:flex">
                  {issue.labels.slice(0, 2).map((l) => <LabelChip key={l.id} name={l.name} color={l.color} />)}
                </div>
                <SlaBadge sla={evaluateSla(issue, slaTargets)} />
                <TypeIcon type={issue.type as IssueKind} className="hidden h-3.5 w-3.5 sm:block" />
                {issue.source === "API" && issue.occurrences > 1 && (
                  <span className="hidden items-center gap-0.5 text-[11px] font-medium text-danger sm:inline-flex" title="Occurrences">
                    <Repeat className="h-3 w-3" />{issue.occurrences}
                  </span>
                )}
                {issue._count.comments > 0 && (
                  <span className="hidden items-center gap-1 text-[11px] text-faint md:inline-flex">
                    <MessageSquare className="h-3 w-3" />{issue._count.comments}
                  </span>
                )}
                {issue.dueDate && (
                  <span className={`hidden items-center gap-1 text-[11px] md:inline-flex ${overdue ? "font-medium text-danger" : "text-faint"}`}>
                    <CalendarClock className="h-3 w-3" />{shortDate(issue.dueDate)}
                  </span>
                )}
                <span className="hidden w-16 text-right text-[11px] text-faint md:block">
                  <TimeAgo date={issue.updatedAt} />
                </span>
                <Avatar name={issue.assignee?.name} size={20} />
              </li>
            );
          })}
        </ul>
      </div>

      {selected.size > 0 && (
        <div
          role="toolbar"
          aria-label="Bulk actions"
          className="animate-pop fixed inset-x-0 bottom-5 z-30 mx-auto flex w-fit max-w-[calc(100vw-32px)] flex-wrap items-center gap-1 rounded-xl border border-line bg-surface p-1.5 shadow-[var(--shadow-lg)]"
        >
          <span className="px-2 text-[13px] font-medium">{selected.size} selected</span>
          <Picker side="top" label="Set status" options={statusOptions} value={null} onChange={(v) => bulk({ status: v as Status }, "Updated")} disabled={pending}>
            Status
          </Picker>
          <Picker side="top" label="Set priority" options={priorityOptions} value={null} onChange={(v) => bulk({ priority: v as Priority }, "Updated")} disabled={pending}>
            Priority
          </Picker>
          <Picker
            side="top"
            label="Assign to"
            options={assigneeOptions(members, meId)}
            value={null}
            onChange={(v) => bulk({ assigneeId: v || null }, v ? "Assigned" : "Unassigned")}
            disabled={pending}
          >
            Assignee
          </Picker>
          <ConfirmButton
            className="btn-ghost h-7 px-2 text-danger hover:text-danger"
            title={`Delete ${selected.size} ${selected.size === 1 ? "issue" : "issues"}?`}
            description={
              canDeleteAny
                ? "Comments and history are deleted too. This can't be undone."
                : "You can delete issues you reported. Comments and history are deleted too."
            }
            onConfirm={remove}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </ConfirmButton>
          <button className="btn-icon h-7 w-7" onClick={() => setSelected(new Set())} aria-label="Clear selection">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
