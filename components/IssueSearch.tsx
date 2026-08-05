"use client";

import { useMemo, useState } from "react";
import type { Issue } from "@prisma/client";
import IssueCard from "@/components/IssueCard";

interface IssueSearchProps {
  initialIssues: Issue[];
}

type StatusFilter = "ALL" | "OPEN" | "IN_PROGRESS" | "CLOSED";
type PriorityFilter = "ALL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type SortKey = "newest" | "oldest" | "status" | "priority";

const STATUS_TABS: { key: StatusFilter; label: string; colour: string }[] = [
  { key: "ALL", label: "All", colour: "text-slate-800 dark:text-slate-400" },
  { key: "OPEN", label: "Open", colour: "text-rose-600 dark:text-rose-400" },
  { key: "IN_PROGRESS", label: "In Progress", colour: "text-amber-600 dark:text-amber-400" },
  { key: "CLOSED", label: "Closed", colour: "text-emerald-600 dark:text-emerald-400" },
];

const PRIORITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export default function IssueSearch({ initialIssues }: IssueSearchProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  const filteredIssues = useMemo(() => {
    const q = query.trim().toLowerCase();

    let issues = initialIssues.filter((issue) => {
      if (statusFilter !== "ALL" && issue.status !== statusFilter) return false;
      if (priorityFilter !== "ALL" && issue.priority !== priorityFilter) return false;
      if (!q) return true;
      return (
        issue.title.toLowerCase().includes(q) ||
        issue.description.toLowerCase().includes(q)
      );
    });

    issues = [...issues].sort((a, b) => {
      switch (sortKey) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "status":
          return a.status.localeCompare(b.status);
        case "priority":
          return (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
        default:
          return 0;
      }
    });

    return issues;
  }, [initialIssues, query, statusFilter, priorityFilter, sortKey]);

  // Count per status for tab badges
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: initialIssues.length, OPEN: 0, IN_PROGRESS: 0, CLOSED: 0 };
    for (const issue of initialIssues) c[issue.status] = (c[issue.status] ?? 0) + 1;
    return c;
  }, [initialIssues]);

  return (
    <>
      {/* Status filter tabs */}
      <div className="card-shadow flex flex-wrap items-center gap-1 rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              id={`filter-tab-${tab.key.toLowerCase()}`}
              onClick={() => setStatusFilter(tab.key)}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "bg-linear-to-r from-cyan-600 to-blue-600 text-white shadow-sm shadow-cyan-500/20 dark:from-cyan-500 dark:to-blue-500 dark:text-slate-950"
                  : "text-slate-700 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  isActive
                    ? "bg-white/20 text-white dark:bg-slate-950/25 dark:text-slate-950"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-500"
                }`}
              >
                {counts[tab.key] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + Sort row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
            </svg>
          </span>
          <input
            id="issue-search-input"
            type="text"
            placeholder="Search issues by title or description…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:shadow-none dark:placeholder:text-slate-500 dark:focus:border-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <label htmlFor="priority-select" className="text-xs font-medium text-slate-700 dark:text-slate-400 whitespace-nowrap">
              Priority
            </label>
            <select
              id="priority-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:shadow-none"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="sort-select" className="text-xs font-medium text-slate-700 dark:text-slate-400 whitespace-nowrap">
              Sort by
            </label>
            <select
              id="sort-select"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:shadow-none"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="status">Status</option>
              <option value="priority">Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-slate-600 dark:text-slate-500">
          Showing <span className="font-semibold text-slate-800 dark:text-slate-300">{filteredIssues.length}</span>{" "}
          {filteredIssues.length === 1 ? "issue" : "issues"}
          {statusFilter !== "ALL" ? ` · ${statusFilter.replace("_", " ")}` : ""}
          {priorityFilter !== "ALL" ? ` · ${priorityFilter} priority` : ""}
        </p>
        {(query || statusFilter !== "ALL" || priorityFilter !== "ALL") && (
          <button
            onClick={() => {
              setQuery("");
              setStatusFilter("ALL");
              setPriorityFilter("ALL");
            }}
            className="text-xs font-medium text-cyan-600 hover:underline dark:text-cyan-400"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Issue list */}
      <div className="flex flex-col gap-4">
        {filteredIssues.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="text-2xl">🔍</p>
            <p className="mt-2 font-medium text-slate-800 dark:text-slate-300">No issues found</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-500">
              {query ? "Try a different search term." : "No issues match the selected filter."}
            </p>
          </div>
        ) : (
          filteredIssues.map((issue) => <IssueCard key={issue.id} issue={issue} />)
        )}
      </div>
    </>
  );
}
