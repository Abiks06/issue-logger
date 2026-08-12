"use client";

import Link from "next/link";
import type { Issue } from "@prisma/client";
import { motion } from "framer-motion";
import AnimatedCounter from "@/components/AnimatedCounter";
import {
  ClipboardList,
  CircleDot,
  Clock,
  CheckCircle2,
  Plus,
  PenLine,
  ListTodo,
  ArrowRight,
  ArrowDown,
  Diamond,
  ArrowUp,
  ChevronsUp,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: "status-badge-open",
    IN_PROGRESS: "status-badge-progress",
    CLOSED: "status-badge-closed",
  };
  const cls = map[status] ?? "status-badge-open";
  return (
    <span
      className={`${cls} inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide`}
    >
      {status.replace("_", " ")}
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
  const cls = map[priority] ?? "priority-badge-medium";
  return (
    <span
      className={`${cls} inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium`}
    >
      {icons[priority]}
      {priority}
    </span>
  );
}

// Donut Chart ──────────────────────────────────────────────────────────

function DonutChart({
  open,
  inProgress,
  closed,
  total,
}: {
  open: number;
  inProgress: number;
  closed: number;
  total: number;
}) {
  const r = 56;
  const circumference = 2 * Math.PI * r;
  const safeTotal = total || 1;

  const openDash = (open / safeTotal) * circumference;
  const progressDash = (inProgress / safeTotal) * circumference;
  const closedDash = (closed / safeTotal) * circumference;

  const openOffset = 0;
  const progressOffset = -(openDash);
  const closedOffset = -(openDash + progressDash);

  return (
    <div className="relative mx-auto h-40 w-40">
      <svg viewBox="0 0 130 130" className="h-full w-full -rotate-90">
        {/* Track */}
        <circle
          cx="65" cy="65" r={r}
          fill="none" stroke="currentColor" strokeWidth="14"
          className="text-slate-200 dark:text-slate-800"
        />
        {/* Closed (emerald) */}
        {closed > 0 && (
          <motion.circle
            cx="65" cy="65" r={r}
            fill="none" stroke="#10b981" strokeWidth="14"
            strokeDasharray={`${closedDash} ${circumference}`}
            strokeDashoffset={closedOffset}
            strokeLinecap="butt"
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${closedDash} ${circumference}` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
          />
        )}
        {/* In Progress (amber) */}
        {inProgress > 0 && (
          <motion.circle
            cx="65" cy="65" r={r}
            fill="none" stroke="#f59e0b" strokeWidth="14"
            strokeDasharray={`${progressDash} ${circumference}`}
            strokeDashoffset={progressOffset}
            strokeLinecap="butt"
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${progressDash} ${circumference}` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
          />
        )}
        {/* Open (rose) */}
        {open > 0 && (
          <motion.circle
            cx="65" cy="65" r={r}
            fill="none" stroke="#f43f5e" strokeWidth="14"
            strokeDasharray={`${openDash} ${circumference}`}
            strokeDashoffset={openOffset}
            strokeLinecap="butt"
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${openDash} ${circumference}` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
          />
        )}
      </svg>
      {/* Centre label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <AnimatedCounter
          value={total}
          className="text-2xl font-bold text-slate-900 dark:text-slate-50"
        />
        <span className="text-xs text-slate-500 dark:text-slate-400">issues</span>
      </div>
    </div>
  );
}

// ─── Animation variants ────────────────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

// ─── Page ─────────────────────────────────────────────────────────────────

interface DashboardClientProps {
  issues: Issue[];
  totalIssues: number;
  openIssues: number;
  inProgressIssues: number;
  closedIssues: number;
}

export default function DashboardClient({
  issues,
  totalIssues,
  openIssues,
  inProgressIssues,
  closedIssues,
}: DashboardClientProps) {
  const stats = [
    {
      label: "Total",
      value: totalIssues,
      icon: <ClipboardList className="h-5 w-5" />,
      iconBg: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
      percent: 100,
      barColor: "bg-slate-400",
    },
    {
      label: "Open",
      value: openIssues,
      icon: <CircleDot className="h-5 w-5" />,
      iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
      percent: totalIssues ? Math.round((openIssues / totalIssues) * 100) : 0,
      barColor: "bg-rose-500",
    },
    {
      label: "In Progress",
      value: inProgressIssues,
      icon: <Clock className="h-5 w-5" />,
      iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
      percent: totalIssues ? Math.round((inProgressIssues / totalIssues) * 100) : 0,
      barColor: "bg-amber-500",
    },
    {
      label: "Closed",
      value: closedIssues,
      icon: <CheckCircle2 className="h-5 w-5" />,
      iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
      percent: totalIssues ? Math.round((closedIssues / totalIssues) * 100) : 0,
      barColor: "bg-emerald-500",
    },
  ];

  return (
    <motion.div
      className="hero-glow min-h-screen px-3 py-5 sm:px-6 sm:py-8 lg:px-8"
      variants={container}
      initial="hidden"
      animate="visible"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:gap-6">

        {/* ── Hero banner ────────────────────────────────────────── */}
        <motion.div
          variants={item}
          className="glass-card relative overflow-hidden rounded-2xl p-5 sm:rounded-3xl sm:p-8 lg:p-10"
        >
          {/* Background orbs */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gradient-to-br from-cyan-400/15 to-blue-600/8 blur-3xl dark:from-cyan-500/8 dark:to-blue-700/4" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-gradient-to-tr from-violet-400/8 to-fuchsia-600/4 blur-3xl" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-400 sm:text-xs">
                Operations Overview
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl dark:text-slate-50">
                Stay on top of every issue.
              </h1>
              <p className="mt-2 text-xs leading-6 text-slate-600 sm:text-sm sm:leading-7 dark:text-slate-400">
                A modern summary of your current workload, progress, and the latest problems that need attention.
              </p>
            </div>

            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/issues/new"
                id="hero-create-btn"
                className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-lg shadow-cyan-500/20 sm:w-fit focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
              >
                <Plus className="h-4 w-4" />
                New Issue
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* ── Stat cards ──── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              variants={item}
              className="card-elevated rounded-2xl p-3.5 sm:p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 sm:text-xs">
                  {stat.label}
                </p>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.iconBg}`}>
                  {stat.icon}
                </span>
              </div>
              <AnimatedCounter
                value={stat.value}
                className="mt-1 block text-2xl font-bold tabular-nums text-slate-900 sm:mt-2 sm:text-3xl lg:text-4xl dark:text-slate-50"
              />
              {/* Mini progress bar */}
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 sm:mt-3">
                <motion.div
                  className={`${stat.barColor} h-full rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${stat.percent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 + i * 0.1 }}
                />
              </div>
              <p className="mt-1 text-right text-[10px] text-slate-500 dark:text-slate-500 sm:text-xs">
                {stat.percent}% of total
              </p>
            </motion.div>
          ))}
        </div>

        {/* ── Main content row ───────────────────────────────────── */}
        <div className="grid gap-5 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px] lg:gap-6">

          {/* Recent Issues */}
          <motion.div
            variants={item}
            className="card-elevated rounded-2xl p-5 sm:rounded-3xl sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between sm:mb-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400 sm:text-xs">
                  Recent Activity
                </p>
                <h2 className="mt-0.5 text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg">
                  Latest Issues
                </h2>
              </div>
              <Link
                href="/issues"
                id="view-all-issues-link"
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-cyan-600 transition-colors hover:bg-cyan-50 hover:text-cyan-700 dark:text-cyan-400 dark:hover:bg-cyan-950/30"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {issues.length === 0 ? (
                <div className="py-8 text-center sm:py-10">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                    <ListTodo className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No issues yet</p>
                  <p className="mt-1 text-xs text-slate-500">Create your first one to get started!</p>
                </div>
              ) : (
                issues.map((issue, i) => (
                  <motion.div
                    key={issue.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }}
                    className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {issue.title}
                      </p>
                      <p suppressHydrationWarning className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">
                        {new Date(issue.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 self-start sm:self-auto">
                      <PriorityBadge priority={issue.priority} />
                      <StatusBadge status={issue.status} />
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          {/* Right column */}
          <div className="flex flex-col gap-5 lg:gap-6">

            {/* Donut chart breakdown */}
            <motion.div
              variants={item}
              className="card-elevated rounded-2xl p-5 sm:rounded-3xl sm:p-6"
            >
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400 sm:text-xs">
                Breakdown
              </p>
              <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg">
                Status Distribution
              </h2>
              <DonutChart
                open={openIssues}
                inProgress={inProgressIssues}
                closed={closedIssues}
                total={totalIssues}
              />
              <div className="mt-4 flex flex-col gap-2.5">
                {[
                  { label: "Open", color: "bg-rose-500", value: openIssues },
                  { label: "In Progress", color: "bg-amber-500", value: inProgressIssues },
                  { label: "Closed", color: "bg-emerald-500", value: closedIssues },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                      <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                    </div>
                    <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              variants={item}
              className="card-elevated rounded-2xl p-5 sm:rounded-3xl sm:p-6"
            >
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400 sm:text-xs">
                Actions
              </p>
              <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg">
                Quick Actions
              </h2>
              <div className="flex flex-col gap-2.5">
                <Link
                  href="/issues/new"
                  id="quick-create-issue"
                  className="group flex items-start gap-3 rounded-xl border border-slate-100/80 bg-slate-50/50 p-3.5 transition-all hover:border-cyan-300 hover:bg-cyan-50/40 hover:shadow-sm dark:border-slate-800/60 dark:bg-slate-800/30 dark:hover:border-cyan-600 dark:hover:bg-cyan-950/30"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600 transition-colors group-hover:bg-cyan-200 dark:bg-cyan-950 dark:text-cyan-400 dark:group-hover:bg-cyan-900">
                    <PenLine className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 sm:text-sm dark:text-slate-100">Open a new issue</p>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">
                      Capture bugs, requests, or tasks.
                    </p>
                  </div>
                </Link>
                <Link
                  href="/issues"
                  id="quick-review-issues"
                  className="group flex items-start gap-3 rounded-xl border border-slate-100/80 bg-slate-50/50 p-3.5 transition-all hover:border-violet-300 hover:bg-violet-50/40 hover:shadow-sm dark:border-slate-800/60 dark:bg-slate-800/30 dark:hover:border-violet-600 dark:hover:bg-violet-950/30"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 transition-colors group-hover:bg-violet-200 dark:bg-violet-950 dark:text-violet-400 dark:group-hover:bg-violet-900">
                    <ListTodo className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 sm:text-sm dark:text-slate-100">Review all issues</p>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">
                      Browse and filter the full backlog.
                    </p>
                  </div>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
