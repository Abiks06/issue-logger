"use client";

import { useState, useTransition } from "react";
import type { Issue } from "@prisma/client";
import { deleteIssue, updateIssueStatus } from "@/actions/issue";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Pencil,
  Loader2,
  ArrowRightCircle,
  CheckCircle2,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ArrowDown,
  Diamond,
  ArrowUp,
  ChevronsUp,
} from "lucide-react";

interface IssueCardProps {
  issue: Issue;
  index?: number;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: "status-badge-open",
    IN_PROGRESS: "status-badge-progress",
    CLOSED: "status-badge-closed",
  };
  return (
    <span
      className={`${map[status] ?? "status-badge-open"} inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide`}
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
  const icons: Record<string, React.ReactNode> = {
    LOW: <ArrowDown className="h-3 w-3" />,
    MEDIUM: <Diamond className="h-3 w-3" />,
    HIGH: <ArrowUp className="h-3 w-3" />,
    CRITICAL: <ChevronsUp className="h-3 w-3" />,
  };
  return (
    <span
      className={`${map[priority] ?? "priority-badge-medium"} inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium`}
    >
      {icons[priority]}
      {priority}
    </span>
  );
}

function IssueCard({ issue, index = 0 }: IssueCardProps) {
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
      const res = await updateIssueStatus(issue.id, status);
      if (res?.success) {
        toast.success(
          status === "IN_PROGRESS"
            ? "Marked as In Progress"
            : status === "CLOSED"
            ? "Issue closed"
            : "Issue reopened"
        );
      } else {
        toast.error(res?.error || "Failed to update issue status.");
      }
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
      const res = await deleteIssue(issue.id);
      if (res?.success) {
        toast.success("Issue deleted");
      } else {
        toast.error(res?.error || "Failed to delete issue.");
      }
      setPendingAction(null);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] as const }}
      className="group card-elevated rounded-2xl p-4 sm:p-5 gradient-border"
    >
      {/* Header */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex items-start gap-2 min-w-0">
          <motion.button
            onClick={copyIssueId}
            title="Click to copy issue reference"
            className="mt-0.5 shrink-0 rounded-lg border border-slate-200/80 bg-slate-50/80 px-2 py-0.5 text-xs font-mono font-medium text-slate-600 transition-all hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-600 dark:border-slate-700/80 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:border-cyan-500 dark:hover:bg-cyan-950/30 dark:hover:text-cyan-400 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="flex items-center gap-1">
              #{issue.id}
              <Copy className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-100" />
            </span>
          </motion.button>
          <h2 className="text-sm font-semibold leading-snug text-slate-900 sm:text-base dark:text-slate-100 wrap-break-word">
            {issue.title}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 self-start sm:self-auto">
          <PriorityBadge priority={issue.priority} />
          <StatusBadge status={issue.status} />
        </div>
      </div>

      {/* Description */}
      <div className="mt-3 rounded-xl border border-slate-100/80 bg-slate-50/50 p-3.5 sm:p-4 dark:border-slate-800/50 dark:bg-slate-800/20">
        <div className="prose prose-slate max-w-none text-xs leading-5 text-slate-700 sm:text-sm sm:leading-6 dark:prose-invert dark:text-slate-300">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayDescription}</ReactMarkdown>
        </div>
        {isLongDescription && (
          <motion.button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 flex items-center gap-1 text-xs font-medium text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 cursor-pointer"
            whileTap={{ scale: 0.97 }}
          >
            {expanded ? (
              <>Show less <ChevronUp className="h-3 w-3" /></>
            ) : (
              <>Show full description <ChevronDown className="h-3 w-3" /></>
            )}
          </motion.button>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span suppressHydrationWarning className="text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">
          Created{" "}
          {new Date(issue.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Edit link */}
          <Link
            href={`/issues/${issue.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm sm:px-3 sm:py-1.5 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </Link>

          {/* Status actions */}
          {issue.status !== "IN_PROGRESS" && issue.status !== "CLOSED" && (
            <motion.button
              disabled={isPending}
              onClick={() => handleStatusChange("IN_PROGRESS")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200/80 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 transition-all hover:bg-amber-100 hover:shadow-sm disabled:opacity-50 sm:px-3 sm:py-1.5 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {pendingAction === "IN_PROGRESS" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ArrowRightCircle className="h-3 w-3" />
              )}
              {pendingAction === "IN_PROGRESS" ? "Updating…" : "In Progress"}
            </motion.button>
          )}

          {issue.status !== "CLOSED" && (
            <motion.button
              disabled={isPending}
              onClick={() => handleStatusChange("CLOSED")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition-all hover:bg-emerald-100 hover:shadow-sm disabled:opacity-50 sm:px-3 sm:py-1.5 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {pendingAction === "CLOSED" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              {pendingAction === "CLOSED" ? "Closing…" : "Close"}
            </motion.button>
          )}

          {issue.status === "CLOSED" && (
            <motion.button
              disabled={isPending}
              onClick={() => handleStatusChange("OPEN")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-all hover:bg-slate-50 hover:shadow-sm disabled:opacity-50 sm:px-3 sm:py-1.5 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {pendingAction === "OPEN" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RotateCcw className="h-3 w-3" />
              )}
              {pendingAction === "OPEN" ? "Reopening…" : "Reopen"}
            </motion.button>
          )}

          {/* Delete */}
          <AnimatePresence mode="wait">
            {confirmDelete ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5"
              >
                <span className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Sure?
                </span>
                <motion.button
                  disabled={isPending}
                  onClick={handleDelete}
                  className="rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 transition-all hover:bg-rose-100 disabled:opacity-50 sm:px-3 sm:py-1.5 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400 cursor-pointer"
                  whileTap={{ scale: 0.95 }}
                >
                  {pendingAction === "delete" ? "Deleting…" : "Yes, Delete"}
                </motion.button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-all hover:bg-slate-50 sm:px-3 sm:py-1.5 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="delete"
                disabled={isPending}
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200/80 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600 transition-all hover:bg-rose-100 hover:shadow-sm disabled:opacity-50 sm:px-3 sm:py-1.5 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/40 cursor-pointer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default IssueCard;
