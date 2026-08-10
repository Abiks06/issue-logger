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
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        {/* Page header */}
        <div className="card-shadow-lg flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-400">
              Activity Board
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              All Issues
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {issues.length} total issue{issues.length !== 1 ? "s" : ""}
            </p>
          </div>

          <Link
            href="/issues/new"
            id="new-issue-btn"
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 transition-all hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
          >
            + New Issue
          </Link>
        </div>

        <IssueSearch initialIssues={issues} />
      </div>
    </div>
  );
}
