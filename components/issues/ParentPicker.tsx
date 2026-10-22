"use client";

import { useEffect, useRef, useState } from "react";
import { CornerLeftUp, X } from "lucide-react";
import { findProjectIssues } from "@/actions/issues";
import { issueKey, type Status } from "@/lib/constants";
import { StatusIcon } from "@/components/ui/icons";

type IssueRef = { id: string; number: number; title: string; status: string };

/** Searchable picker for an issue's parent, with a clear button. */
export default function ParentPicker({
  projectId,
  projectKey,
  issueId,
  parent,
  disabled,
  triggerClassName,
  onChange,
}: {
  projectId: string;
  projectKey: string;
  issueId: string;
  parent: IssueRef | null;
  disabled: boolean;
  triggerClassName: string;
  onChange: (parent: IssueRef | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IssueRef[]>([]);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const rows = await findProjectIssues(projectId, query);
      if (!cancelled) setResults(rows.filter((r) => r.id !== issueId));
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, query, projectId, issueId]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const choose = (r: IssueRef) => {
    onChange(r);
    setOpen(false);
  };

  return (
    <div ref={root} className="relative flex items-center">
      <button
        type="button"
        className={triggerClassName}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Parent issue"
        onClick={() => {
          setQuery("");
          setActive(0);
          setOpen((o) => !o);
        }}
      >
        {parent ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <StatusIcon status={parent.status as Status} />
            <span className="font-mono text-xs text-faint">{issueKey(projectKey, parent.number)}</span>
            <span className="truncate">{parent.title}</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-faint"><CornerLeftUp className="h-3.5 w-3.5" /> None</span>
        )}
      </button>
      {parent && !disabled && (
        <button className="btn-icon absolute right-0 h-7 w-7" aria-label="Remove parent" onClick={() => onChange(null)}>
          <X className="h-3 w-3" />
        </button>
      )}

      {open && (
        <div
          className="menu animate-pop absolute right-0 top-full mt-1 w-72"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setActive((a) => Math.min(results.length - 1, a + 1));
            else if (e.key === "ArrowUp") setActive((a) => Math.max(0, a - 1));
            else if (e.key === "Enter" && results[active]) choose(results[active]);
            else if (e.key === "Escape") setOpen(false);
            else return;
            e.preventDefault();
          }}
        >
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Search issues by title or number…"
            className="mb-1 h-8 w-full rounded-md bg-surface-2 px-2 text-[13px] text-fg outline-none placeholder:text-faint"
            aria-label="Search parent issue"
          />
          <div role="listbox" className="max-h-64 overflow-y-auto">
            {results.length === 0 && <p className="px-2 py-1.5 text-[13px] text-faint">No matching issues</p>}
            {results.map((r, i) => (
              <div
                key={r.id}
                role="option"
                aria-selected={parent?.id === r.id}
                data-active={i === active}
                className="menu-item cursor-pointer"
                onPointerEnter={() => setActive(i)}
                onClick={() => choose(r)}
              >
                <StatusIcon status={r.status as Status} />
                <span className="font-mono text-[11px] text-faint">{issueKey(projectKey, r.number)}</span>
                <span className="min-w-0 flex-1 truncate">{r.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
