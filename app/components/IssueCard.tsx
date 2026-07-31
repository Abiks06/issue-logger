"use client";

import { useState, useTransition } from "react";
import type { Issue } from "@prisma/client";
import { deleteIssue, updateIssueStatus } from "@/app/actions/issue";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import toast from "react-hot-toast";

interface IssueCardProps {
  issue: Issue;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: "status-badge-open",
    IN_PROGRESS: "status-badge-progress",
    CLOSED: "status-badge-closed",
  };
  return (
    <span
      className={`${map[status] ?? "status-badge-open"} inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    LOW: "priority-badge-low",
    MEDIUM: "priority-badge-medium",
    HIGH: "priority-badge-high",
    CRITICAL: "priority-badge-critical",
  };
  const icons: Record<string, string> = {
    LOW: "▽",
    MEDIUM: "◇",
    HIGH: "△",
    CRITICAL: "⬆",
  };
  return (
    <span
      className={`${map[priority] ?? "priority-badge-medium"} inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium`}
    >
      <span aria-hidden="true">{icons[priority]}</span>
      {priority}
    </span>
  );
}

function IssueCard({ issue }: IssueCardProps) {
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const isLongDescription = issue.description.length > 200;
  const displayDescription = isLongDescription && !expanded
    ? `${issue.description.slice(0, 200)}…`
    : issue.description;

  const copyIssueId = () => {
    navigator.clipboard.writeText(`#${issue.id}: ${issue.title}`);
    toast.success(`Copied Issue #${issue.id} to clipboard!`);
  };

  const handleStatusChange = (status: "IN_PROGRESS" | "CLOSED" | "OPEN") => {
    setPendingAction(status);
    startTransition(async () => {
      await updateIssueStatus(issue.id, status);
      toast.success(
        status === "IN_PROGRESS"
          ? "Marked as In Progress"
          : status === "CLOSED"
          ? "Issue closed"
          : "Issue reopened"
      );
      setPendingAction(null);
    });
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setPendingAction("delete");
    startTransition(async () => {
      await deleteIssue(issue.id);
      toast.success("Issue deleted");
      setPendingAction(null);
    });
  };

  return (
    <div className="group card-shadow rounded-2xl border border-slate-200/80 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_14px_34px_-10px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-none dark:hover:shadow-none">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={copyIssueId}
            title="Click to copy issue reference"
            className="rounded-md border border-slate-100 bg-slate-50 px-2 py-0.5 text-xs font-mono font-medium text-slate-500 transition-colors hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:border-cyan-500 dark:hover:bg-cyan-950/30 dark:hover:text-cyan-400"
          >
            #{issue.id}
          </button>
          <h2 className="text-base font-semibold text-slate-900 leading-snug dark:text-slate-100">
            {issue.title}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <PriorityBadge priority={issue.priority} />
          <StatusBadge status={issue.status} />
        </div>
      </div>

      {/* Description */}
      <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800/50 dark:bg-slate-800/30">
        <div className="prose prose-slate max-w-none text-sm leading-6 text-slate-700 dark:prose-invert dark:text-slate-300">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayDescription}</ReactMarkdown>
        </div>
        {isLongDescription && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-xs font-medium text-cyan-600 hover:underline dark:text-cyan-400"
          >
            {expanded ? "Show less ↑" : "Show full description ↓"}
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <span suppressHydrationWarning className="text-xs text-slate-400 dark:text-slate-500">
          Created{" "}
          {new Date(issue.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          {/* Edit link */}
          <Link
            href={`/issues/${issue.id}/edit`}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Edit
          </Link>

          {/* Status actions */}
          {issue.status !== "IN_PROGRESS" && issue.status !== "CLOSED" && (
            <button
              disabled={isPending}
              onClick={() => handleStatusChange("IN_PROGRESS")}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50"
            >
              {pendingAction === "IN_PROGRESS" ? "Updating…" : "Mark In Progress"}
            </button>
          )}

          {issue.status !== "CLOSED" && (
            <button
              disabled={isPending}
              onClick={() => handleStatusChange("CLOSED")}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
            >
              {pendingAction === "CLOSED" ? "Closing…" : "Close"}
            </button>
          )}

          {issue.status === "CLOSED" && (
            <button
              disabled={isPending}
              onClick={() => handleStatusChange("OPEN")}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {pendingAction === "OPEN" ? "Reopening…" : "Reopen"}
            </button>
          )}

          {/* Delete */}
          {confirmDelete ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
                Sure?
              </span>
              <button
                disabled={isPending}
                onClick={handleDelete}
                className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400"
              >
                {pendingAction === "delete" ? "Deleting…" : "Yes, Delete"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              disabled={isPending}
              onClick={handleDelete}
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default IssueCard;
