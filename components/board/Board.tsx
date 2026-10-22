"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Search, UserRound } from "lucide-react";
import { createIssue, moveIssue } from "@/actions/issues";
import { STATUS_META, type Status } from "@/lib/constants";
import { positionBetween } from "@/lib/ordering";
import type { IssueRow } from "@/lib/queries";
import { StatusIcon } from "@/components/ui/icons";
import IssueCard from "@/components/issues/IssueCard";

type Props = {
  projectId: string;
  projectKey: string;
  columns: Status[];
  issues: IssueRow[];
  meId: string;
  canEdit: boolean;
  /** Extra text under a column (e.g. "showing last 30 days"). */
  columnNotes?: Partial<Record<Status, string>>;
};

type Drop = { status: Status; index: number };

function sortColumn(list: IssueRow[]) {
  return [...list].sort((a, b) => a.position - b.position);
}

/**
 * Kanban board with native HTML5 drag and drop. Moves apply optimistically
 * and roll back if the server rejects them. Viewers get a read-only board.
 */
export default function Board({ projectId, projectKey, columns, issues: initial, meId, canEdit, columnNotes = {} }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [issues, setIssues] = useState(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<Drop | null>(null);
  const [query, setQuery] = useState("");
  const [mine, setMine] = useState(false);
  const [quickAdd, setQuickAdd] = useState<Status | null>(null);
  const columnRefs = useRef<Partial<Record<Status, HTMLDivElement | null>>>({});

  // Fresh server data (after router.refresh) replaces local state.
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setIssues(initial);
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return issues.filter(
      (i) =>
        (!mine || i.assignee?.id === meId) &&
        (!q || i.title.toLowerCase().includes(q) || `${projectKey}-${i.number}`.toLowerCase().includes(q)),
    );
  }, [issues, query, mine, meId, projectKey]);

  const byColumn = useMemo(() => {
    const map = Object.fromEntries(columns.map((c) => [c, [] as IssueRow[]])) as Record<Status, IssueRow[]>;
    for (const i of visible) map[i.status as Status]?.push(i);
    for (const c of columns) map[c] = sortColumn(map[c]);
    return map;
  }, [visible, columns]);

  /** Insertion index from the pointer's Y position against card midpoints. */
  const indexAt = (status: Status, clientY: number) => {
    const cards = columnRefs.current[status]?.querySelectorAll<HTMLElement>("[data-card]") ?? [];
    let index = 0;
    for (const card of cards) {
      if (card.dataset.card === dragId) continue;
      const r = card.getBoundingClientRect();
      if (clientY > r.top + r.height / 2) index++;
    }
    return index;
  };

  const onDrop = (status: Status) => {
    const id = dragId;
    const target = drop;
    setDragId(null);
    setDrop(null);
    if (!id || !target) return;

    const moving = issues.find((i) => i.id === id);
    if (!moving) return;
    // Dropped back where it started: nothing to do.
    if (moving.status === status && byColumn[status].findIndex((i) => i.id === id) === target.index) return;

    // Neighbours come from the cards the user can see. With a filter active,
    // hidden cards may land on either side, which is fine for a manual order.
    const column = byColumn[status].filter((i) => i.id !== id);
    const before = column[target.index - 1] ?? null;
    const after = column[target.index] ?? null;
    const position = positionBetween(before?.position, after?.position);

    const snapshot = issues;
    setIssues((list) => list.map((i) => (i.id === id ? { ...i, status, position } : i)));

    startTransition(async () => {
      const res = await moveIssue(id, status, before?.id ?? null, after?.id ?? null);
      if (!res.ok) {
        setIssues(snapshot);
        toast.error(res.error);
      } else {
        if (moving.status !== status) toast.success(`${projectKey}-${moving.number} → ${STATUS_META[status].label}`);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
        <div className="relative w-full max-w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter cards…"
            className="input h-8 pl-8 text-[13px]"
            aria-label="Filter cards"
          />
        </div>
        <button
          onClick={() => setMine((m) => !m)}
          aria-pressed={mine}
          className={`btn h-8 border ${mine ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-muted hover:text-fg"}`}
        >
          <UserRound className="h-3.5 w-3.5" /> Assigned to me
        </button>
        {!canEdit && <span className="text-xs text-faint">Read-only: viewers can&apos;t move cards.</span>}
      </div>

      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto px-4 pb-4 sm:px-6">
        {columns.map((status) => {
          const list = byColumn[status];
          const isTarget = drop?.status === status;
          return (
            <section
              key={status}
              aria-label={STATUS_META[status].label}
              className={`flex w-72 shrink-0 flex-col rounded-lg border bg-surface-2/60 transition-colors ${
                isTarget ? "border-accent/60 bg-accent-soft" : "border-transparent"
              }`}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                const index = indexAt(status, e.clientY);
                if (drop?.status !== status || drop.index !== index) setDrop({ status, index });
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrop((d) => (d?.status === status ? null : d));
              }}
              onDrop={(e) => {
                e.preventDefault();
                onDrop(status);
              }}
            >
              <header className="flex items-center gap-2 px-3 pb-2 pt-3">
                <StatusIcon status={status} />
                <h2 className="text-[13px] font-semibold">{STATUS_META[status].label}</h2>
                <span className="text-xs text-faint">{list.length}</span>
                {canEdit && (
                  <button
                    className="btn-icon ml-auto h-6 w-6"
                    aria-label={`Quick add to ${STATUS_META[status].label}`}
                    title="Quick add"
                    onClick={() => setQuickAdd(quickAdd === status ? null : status)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </header>
              {quickAdd === status && (
                <QuickAdd
                  projectId={projectId}
                  projectKey={projectKey}
                  status={status}
                  onClose={() => setQuickAdd(null)}
                  onCreated={() => router.refresh()}
                />
              )}
              {columnNotes[status] && <p className="px-3 pb-2 text-[11px] text-faint">{columnNotes[status]}</p>}
              <div ref={(el) => { columnRefs.current[status] = el; }} className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
                {list.map((issue, i) => (
                  <div key={issue.id}>
                    {isTarget && drop.index === i && <DropLine />}
                    <div
                      data-card={issue.id}
                      draggable={canEdit}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", issue.id);
                        setDragId(issue.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setDrop(null);
                      }}
                      className={canEdit ? "cursor-grab active:cursor-grabbing" : ""}
                    >
                      <IssueCard issue={issue} projectKey={projectKey} dragging={dragId === issue.id} />
                    </div>
                  </div>
                ))}
                {isTarget && drop.index >= list.length && <DropLine />}
                {list.length === 0 && !isTarget && (
                  <p className="rounded-md border border-dashed border-line py-6 text-center text-xs text-faint">No issues</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function DropLine() {
  return <div className="mb-2 h-0.5 rounded-full bg-accent" aria-hidden />;
}

/** Inline title-only create at the top of a column; Enter adds, Esc closes. */
function QuickAdd({
  projectId,
  projectKey,
  status,
  onClose,
  onCreated,
}: {
  projectId: string;
  projectKey: string;
  status: Status;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!title.trim() || pending) return;
    startTransition(async () => {
      const res = await createIssue(projectId, { title, status });
      if (!res.ok) return void toast.error(res.error);
      toast.success(`Created ${res.data.key}`);
      setTitle("");
      onCreated();
    });
  };

  return (
    <div className="card animate-pop mx-2 mb-2 p-2">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onClose();
        }}
        placeholder="Issue title"
        aria-label={`New issue in ${STATUS_META[status].label}`}
        className="h-7 w-full bg-transparent text-[13px] outline-none placeholder:text-faint"
        readOnly={pending}
      />
      <div className="mt-1 flex items-center justify-between text-[11px] text-faint">
        <Link href={`/projects/${projectKey}/issues/new?status=${status}`} className="hover:text-fg">Full form</Link>
        <span>Enter to add · Esc to close</span>
      </div>
    </div>
  );
}
