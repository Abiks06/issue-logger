"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ArrowRight, FolderKanban, Inbox, LayoutDashboard, Moon, Plus, Search, Settings } from "lucide-react";
import { searchIssues, type SearchHit } from "@/actions/issues";
import { ProjectBadge } from "@/components/ui/bits";
import { StatusIcon } from "@/components/ui/icons";
import type { ShellProject } from "@/components/AppShell";

type Item = { id: string; label: string; hint?: string; icon: React.ReactNode; run: () => void; group: string };

export default function CommandPalette({
  projects,
  onClose,
  newIssueHref,
}: {
  projects: ShellProject[];
  onClose: () => void;
  newIssueHref: string;
}) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => input.current?.focus(), []);

  // Debounced server search; stale responses are dropped.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const result = await searchIssues(q);
      if (!cancelled) setHits(result);
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const go = (href: string) => () => {
    onClose();
    router.push(href);
  };

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const issueItems: Item[] =
      q.length >= 2
        ? hits.map((h) => ({
            id: `issue-${h.key}-${h.number}`,
            label: h.title,
            hint: `${h.key}-${h.number}`,
            icon: <StatusIcon status={h.status} />,
            run: go(`/projects/${h.key}/issues/${h.number}`),
            group: "Issues",
          }))
        : [];

    const actions: Item[] = [
      { id: "new-issue", label: "Create issue", hint: "C", icon: <Plus className="h-4 w-4" />, run: go(newIssueHref), group: "Actions" },
      { id: "new-project", label: "Create project", icon: <FolderKanban className="h-4 w-4" />, run: go("/projects/new"), group: "Actions" },
      {
        id: "theme",
        label: `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`,
        icon: <Moon className="h-4 w-4" />,
        run: () => {
          setTheme(resolvedTheme === "dark" ? "light" : "dark");
          onClose();
        },
        group: "Actions",
      },
      { id: "home", label: "My work", hint: "G H", icon: <LayoutDashboard className="h-4 w-4" />, run: go("/"), group: "Navigate" },
      { id: "inbox", label: "Inbox", hint: "G I", icon: <Inbox className="h-4 w-4" />, run: go("/inbox"), group: "Navigate" },
      { id: "projects", label: "All projects", hint: "G P", icon: <FolderKanban className="h-4 w-4" />, run: go("/projects"), group: "Navigate" },
      { id: "settings", label: "Account settings", icon: <Settings className="h-4 w-4" />, run: go("/settings"), group: "Navigate" },
      ...projects.flatMap((p) => [
        {
          id: `board-${p.key}`,
          label: `${p.name} board`,
          hint: p.key,
          icon: <ProjectBadge projectKey={p.key} color={p.color} size={16} />,
          run: go(`/projects/${p.key}/board`),
          group: "Projects",
        },
        {
          id: `list-${p.key}`,
          label: `${p.name} issues`,
          hint: p.key,
          icon: <ProjectBadge projectKey={p.key} color={p.color} size={16} />,
          run: go(`/projects/${p.key}/issues`),
          group: "Projects",
        },
      ]),
    ].filter((i) => !q || i.label.toLowerCase().includes(q) || i.hint?.toLowerCase().includes(q));

    return [...issueItems, ...actions];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, hits, projects, resolvedTheme, newIssueHref]);

  const clamped = Math.min(active, Math.max(0, items.length - 1));

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [clamped]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(items.length - 1, clamped + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(0, clamped - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[clamped]?.run();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  let lastGroup = "";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh] backdrop-blur-[2px]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="animate-pop w-full max-w-xl overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-lg)]"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search className="h-4 w-4 text-faint" />
          <input
            ref={input}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              if (e.target.value.trim().length < 2) setHits([]);
            }}
            placeholder="Search issues by title or key (e.g. API-12), or type a command…"
            className="h-12 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-faint"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
          />
          <span className="kbd">Esc</span>
        </div>
        <div ref={listRef} id="palette-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-1.5">
          {items.length === 0 && <p className="px-3 py-6 text-center text-[13px] text-faint">No results</p>}
          {items.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            return (
              <div key={item.id}>
                {header && <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-faint">{header}</p>}
                <div
                  role="option"
                  aria-selected={i === clamped}
                  data-active={i === clamped}
                  className="menu-item h-9 cursor-pointer"
                  onMouseMove={() => i !== clamped && setActive(i)}
                  onClick={item.run}
                >
                  <span className="flex w-4 justify-center text-muted">{item.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.hint && <span className="font-mono text-[11px] text-faint">{item.hint}</span>}
                  {i === clamped && <ArrowRight className="h-3.5 w-3.5 text-faint" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
