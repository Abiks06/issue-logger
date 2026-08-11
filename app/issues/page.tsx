import Link from "next/link";
import { prisma } from "@/lib/db";
import IssueSearch from "@/components/IssueSearch";
import type { Metadata } from "next";
import type { Issue } from "@prisma/client";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Issues" };

export default async function IssuesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  const userId = parseInt(session.user.id, 10);

  let issues: Issue[] = [];

  try {
    issues = await prisma.issue.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  } catch (err) {
    console.error("Issues page data fetch failed:", err);
  }

  return (
    <div className="min-h-screen px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:gap-5">
        {/* Page header */}
        <div className="card-shadow-lg flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-400 sm:text-xs">
              Activity Board
            </p>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
              All Issues
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              {issues.length} total issue{issues.length !== 1 ? "s" : ""}
            </p>
          </div>

          <Link
            href="/issues/new"
            id="new-issue-btn"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 transition-all hover:brightness-110 sm:w-fit focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 cursor-pointer"
          >
            + New Issue
          </Link>
        </div>

        <IssueSearch initialIssues={issues} />
      </div>
    </div>
  );
}
