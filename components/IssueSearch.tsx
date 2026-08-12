"use client";

import { useMemo, useState } from "react";
import type { Issue } from "@prisma/client";
import IssueCard from "@/components/IssueCard";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, X, SearchX } from "lucide-react";

interface IssueSearchProps {
  initialIssues: Issue[];
}

type StatusFilter = "ALL" | "OPEN" | "IN_PROGRESS" | "CLOSED";
type PriorityFilter = "ALL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type SortKey = "newest" | "oldest" | "status" | "priority";

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "CLOSED", label: "Closed" },
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

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: initialIssues.length, OPEN: 0, IN_PROGRESS: 0, CLOSED: 0 };
    for (const issue of initialIssues) c[issue.status] = (c[issue.status] ?? 0) + 1;
    return c;
  }, [initialIssues]);

  const hasActiveFilters = query || statusFilter !== "ALL" || priorityFilter !== "ALL";

  return (
    <>
      {/* Status filter tabs */}
      <div className="glass-card flex items-center gap-1 overflow-x-auto no-scrollbar rounded-2xl p-1.5 sm:p-2">
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              id={`filter-tab-${tab.key.toLowerCase()}`}
              onClick={() => setStatusFilter(tab.key)}
              className={`relative flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition-all sm:text-sm cursor-pointer ${
                isActive
                  ? "text-white dark:text-slate-950"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-500/6 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="status-tab-active"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 shadow-sm shadow-cyan-500/20 dark:from-cyan-500 dark:to-blue-500"
                  style={{ zIndex: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
              <span
                className={`relative z-10 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  isActive
                    ? "bg-white/20 text-white dark:bg-slate-950/20 dark:text-slate-950"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-500"
                }`}
              >
                {counts[tab.key] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + Sort row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            id="issue-search-input"
            type="text"
            placeholder="Search issues by title or description…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200/80 bg-white py-2.5 pl-9 pr-4 text-xs sm:text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-ring dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-100 dark:shadow-none dark:placeholder:text-slate-500"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-1.5">
            <label htmlFor="priority-select" className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap sm:text-xs">
              <SlidersHorizontal className="h-3 w-3" />
              Priority
            </label>
            <select
              id="priority-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
              className="w-full rounded-xl border border-slate-200/80 bg-white px-2.5 py-2 text-xs text-slate-700 shadow-sm focus-ring dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-200 dark:shadow-none sm:text-sm sm:px-3 sm:py-2.5 cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-1.5">
            <label htmlFor="sort-select" className="text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap sm:text-xs">
              Sort by
            </label>
            <select
              id="sort-select"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="w-full rounded-xl border border-slate-200/80 bg-white px-2.5 py-2 text-xs text-slate-700 shadow-sm focus-ring dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-200 dark:shadow-none sm:text-sm sm:px-3 sm:py-2.5 cursor-pointer"
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
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Showing <span className="font-semibold text-slate-800 dark:text-slate-300">{filteredIssues.length}</span>{" "}
          {filteredIssues.length === 1 ? "issue" : "issues"}
          {statusFilter !== "ALL" ? ` · ${statusFilter.replace("_", " ")}` : ""}
          {priorityFilter !== "ALL" ? ` · ${priorityFilter} priority` : ""}
        </p>
        {hasActiveFilters && (
          <motion.button
            onClick={() => {
              setQuery("");
              setStatusFilter("ALL");
              setPriorityFilter("ALL");
            }}
            className="flex items-center gap-1 text-xs font-medium text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <X className="h-3 w-3" />
            Reset filters
          </motion.button>
        )}
      </div>

      {/* Issue list */}
      <div className="flex flex-col gap-4">
        <AnimatePresence mode="popLayout">
          {filteredIssues.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card-elevated rounded-2xl border-dashed p-12 text-center"
            >
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <SearchX className="h-7 w-7 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="font-semibold text-slate-800 dark:text-slate-300">No issues found</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
                {query ? "Try a different search term." : "No issues match the selected filter."}
              </p>
            </motion.div>
          ) : (
            filteredIssues.map((issue, i) => (
              <IssueCard key={issue.id} issue={issue} index={i} />
            ))
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
