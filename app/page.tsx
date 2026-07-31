import Link from "next/link";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import type { Issue } from "@prisma/client";
import { auth } from "@/auth";

export const metadata: Metadata = { title: "Dashboard" };

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
      className={`${cls} inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide`}
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
  const cls = map[priority] ?? "priority-badge-medium";
  return (
    <span
      className={`${cls} inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium`}
    >
      {priority}
    </span>
  );
}

// Pure-CSS/SVG donut chart ─────────────────────────────────────────────────

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
          cx="65"
          cy="65"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="14"
          className="text-slate-200 dark:text-slate-800"
        />
        {/* Closed (green) */}
        {closed > 0 && (
          <circle
            cx="65"
            cy="65"
            r={r}
            fill="none"
            stroke="#22c55e"
            strokeWidth="14"
            strokeDasharray={`${closedDash} ${circumference}`}
            strokeDashoffset={closedOffset}
            strokeLinecap="butt"
          />
        )}
        {/* In Progress (amber) */}
        {inProgress > 0 && (
          <circle
            cx="65"
            cy="65"
            r={r}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="14"
            strokeDasharray={`${progressDash} ${circumference}`}
            strokeDashoffset={progressOffset}
            strokeLinecap="butt"
          />
        )}
        {/* Open (rose) */}
        {open > 0 && (
          <circle
            cx="65"
            cy="65"
            r={r}
            fill="none"
            stroke="#f43f5e"
            strokeWidth="14"
            strokeDasharray={`${openDash} ${circumference}`}
            strokeDashoffset={openOffset}
            strokeLinecap="butt"
          />
        )}
      </svg>
      {/* Centre label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          {total}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">issues</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const session = await auth();
  const userId = session?.user?.id ? parseInt(session.user.id, 10) : -1;

  let issues: Issue[] = [];
  let totalIssues = 0, openIssues = 0, inProgressIssues = 0, closedIssues = 0;

  try {
    [issues, totalIssues, openIssues, inProgressIssues, closedIssues] =
      await Promise.all([
        prisma.issue.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 6,
        }),
        prisma.issue.count({ where: { userId } }),
        prisma.issue.count({ where: { status: "OPEN", userId } }),
        prisma.issue.count({ where: { status: "IN_PROGRESS", userId } }),
        prisma.issue.count({ where: { status: "CLOSED", userId } }),
      ]);
  } catch (err) {
    console.error("Dashboard data fetch failed:", err);
  }

  const stats = [
    {
      label: "Total",
      value: totalIssues,
      icon: "📋",
      accent: "from-slate-400 to-slate-600",
      bg: "bg-white dark:bg-slate-900",
      percent: 100,
      barColor: "bg-slate-400",
    },
    {
      label: "Open",
      value: openIssues,
      icon: "🔴",
      accent: "from-rose-400 to-rose-600",
      bg: "bg-white dark:bg-slate-900",
      percent: totalIssues ? Math.round((openIssues / totalIssues) * 100) : 0,
      barColor: "bg-rose-500",
    },
    {
      label: "In Progress",
      value: inProgressIssues,
      icon: "🟡",
      accent: "from-amber-400 to-amber-600",
      bg: "bg-white dark:bg-slate-900",
      percent: totalIssues ? Math.round((inProgressIssues / totalIssues) * 100) : 0,
      barColor: "bg-amber-500",
    },
    {
      label: "Closed",
      value: closedIssues,
      icon: "✅",
      accent: "from-emerald-400 to-emerald-600",
      bg: "bg-white dark:bg-slate-900",
      percent: totalIssues ? Math.round((closedIssues / totalIssues) * 100) : 0,
      barColor: "bg-emerald-500",
    },
  ];

  return (
    <div className="hero-glow min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">

        {/* ── Hero banner ────────────────────────────────────────── */}
        <div className="card-shadow-lg relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900 sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-linear-to-br from-cyan-400/20 to-blue-600/10 blur-3xl dark:from-cyan-500/10 dark:to-blue-700/5" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-linear-to-tr from-violet-400/10 to-fuchsia-600/5 blur-3xl" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-600 dark:text-cyan-400">
                Operations Overview
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-50">
                Stay on top of every issue.
              </h1>
              <p className="mt-3 leading-7 text-slate-600 dark:text-slate-400">
                A modern summary of your current workload, progress, and the latest problems that need attention.
              </p>
            </div>

            <Link
              href="/issues/new"
              id="hero-create-btn"
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 dark:shadow-cyan-600/20"
            >
              + New Issue
            </Link>
          </div>
        </div>

        {/* ── Stat cards ─────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`${stat.bg} card-shadow rounded-2xl border border-slate-200/80 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_14px_34px_-10px_rgba(15,23,42,0.16)] hover:border-slate-200 dark:border-slate-800 dark:shadow-none dark:hover:shadow-none dark:hover:border-slate-700`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  {stat.label}
                </p>
                <span className="text-xl">{stat.icon}</span>
              </div>
              <p className="mt-2 text-4xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
                {stat.value}
              </p>
              {/* Mini progress bar */}
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className={`${stat.barColor} h-full rounded-full transition-all duration-700`}
                  style={{ width: `${stat.percent}%` }}
                />
              </div>
              <p className="mt-1.5 text-right text-xs text-slate-400 dark:text-slate-500">
                {stat.percent}% of total
              </p>
            </div>
          ))}
        </div>

        {/* ── Main content row ───────────────────────────────────── */}
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">

          {/* Recent Issues */}
          <div className="card-shadow rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
                  Recent Activity
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Latest Issues
                </h2>
              </div>
              <Link
                href="/issues"
                id="view-all-issues-link"
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-cyan-600 transition-colors hover:bg-cyan-50 hover:text-cyan-700 dark:text-cyan-400 dark:hover:bg-cyan-950/30"
              >
                View all →
              </Link>
            </div>

            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {issues.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">
                  No issues yet. Create your first one!
                </div>
              ) : (
                issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {issue.title}
                      </p>
                      <p suppressHydrationWarning className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(issue.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <PriorityBadge priority={issue.priority} />
                      <StatusBadge status={issue.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">

            {/* Donut chart breakdown */}
            <div className="card-shadow rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
                Breakdown
              </p>
              <h2 className="mb-5 text-lg font-semibold text-slate-900 dark:text-slate-100">
                Status Distribution
              </h2>
              <DonutChart
                open={openIssues}
                inProgress={inProgressIssues}
                closed={closedIssues}
                total={totalIssues}
              />
              <div className="mt-5 flex flex-col gap-2">
                {[
                  { label: "Open", color: "bg-rose-500", value: openIssues },
                  { label: "In Progress", color: "bg-amber-500", value: inProgressIssues },
                  { label: "Closed", color: "bg-emerald-500", value: closedIssues },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
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
            </div>

            {/* Quick Actions */}
            <div className="card-shadow rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
                Actions
              </p>
              <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
                Quick Actions
              </h2>
              <div className="flex flex-col gap-3">
                <Link
                  href="/issues/new"
                  id="quick-create-issue"
                  className="group flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:border-cyan-300 hover:bg-cyan-50/40 hover:shadow-sm dark:border-slate-800/60 dark:bg-slate-800/40 dark:hover:border-cyan-600 dark:hover:bg-cyan-950/30"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600 group-hover:bg-cyan-200 dark:bg-cyan-950 dark:text-cyan-400 dark:group-hover:bg-cyan-900">
                    ✏️
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">Open a new issue</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Capture bugs, requests, or tasks.
                    </p>
                  </div>
                </Link>
                <Link
                  href="/issues"
                  id="quick-review-issues"
                  className="group flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:border-violet-300 hover:bg-violet-50/40 hover:shadow-sm dark:border-slate-800/60 dark:bg-slate-800/40 dark:hover:border-violet-600 dark:hover:bg-violet-950/30"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 group-hover:bg-violet-200 dark:bg-violet-950 dark:text-violet-400 dark:group-hover:bg-violet-900">
                    📋
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">Review all issues</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Browse and filter the full backlog.
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
