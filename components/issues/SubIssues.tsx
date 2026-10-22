"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import { createIssue } from "@/actions/issues";
import { CLOSED_STATUSES, issueKey, type Priority, type Status } from "@/lib/constants";
import { Avatar } from "@/components/ui/bits";
import { PriorityIcon, StatusIcon } from "@/components/ui/icons";

type Item = { id: string; number: number; title: string; status: string; priority: string; assignee: string | null };

/** Child issues with a progress bar and an inline "add sub-issue" row. */
export default function SubIssues({
  projectId,
  projectKey,
  parentId,
  items,
  canEdit,
}: {
  projectId: string;
  projectKey: string;
  parentId: string;
  items: Item[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  if (items.length === 0 && !canEdit) return null;

  const done = items.filter((i) => CLOSED_STATUSES.includes(i.status as Status)).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  const add = () => {
    if (!title.trim()) return;
    startTransition(async () => {
      const res = await createIssue(projectId, { title, parentId, status: "TODO" });
      if (!res.ok) return void toast.error(res.error);
      setTitle("");
      router.refresh();
    });
  };

  return (
    <section className="mt-8" aria-labelledby="sub-issues-heading">
      <div className="mb-2 flex items-center gap-3">
        <h2 id="sub-issues-heading" className="text-[13px] font-semibold">Sub-issues</h2>
        {items.length > 0 && (
          <>
            <span className="text-xs text-faint">{done} of {items.length} done</span>
            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2" aria-hidden>
              <span className="block h-full rounded-full bg-success transition-[width]" style={{ width: `${pct}%` }} />
            </span>
          </>
        )}
        {canEdit && !adding && (
          <button className="btn-ghost ml-auto h-7 px-2 text-xs" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" /> Add sub-issue
          </button>
        )}
      </div>

      {(items.length > 0 || adding) && (
        <ul className="card divide-y divide-line overflow-hidden">
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-surface-2/60">
              <StatusIcon status={i.status as Status} />
              <span className="w-14 shrink-0 font-mono text-xs text-faint">{issueKey(projectKey, i.number)}</span>
              <Link
                href={`/projects/${projectKey}/issues/${i.number}`}
                className={`min-w-0 flex-1 truncate text-[13px] hover:text-accent ${CLOSED_STATUSES.includes(i.status as Status) ? "text-faint line-through" : "font-medium"}`}
              >
                {i.title}
              </Link>
              <PriorityIcon priority={i.priority as Priority} />
              <Avatar name={i.assignee} size={18} />
            </li>
          ))}
          {adding && (
            <li className="flex items-center gap-2 px-3 py-1.5">
              <StatusIcon status="TODO" />
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") add();
                  if (e.key === "Escape") {
                    setAdding(false);
                    setTitle("");
                  }
                }}
                placeholder="Sub-issue title, Enter to add, Esc to close"
                className="h-7 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-faint"
                aria-label="New sub-issue title"
                readOnly={pending}
              />
              <button className="btn-primary h-7" onClick={add} disabled={pending || !title.trim()}>Add</button>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
