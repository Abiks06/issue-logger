import Link from "next/link";
import { Button } from "@radix-ui/themes";
import { prisma } from "@/lib/db";
import IssueSearch from "@/app/components/IssueSearch";

export default async function IssuesPage() {
  const issues = await prisma.issue.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_45px_-20px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
              Activity Board
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-900 dark:text-slate-100">
              Issues
            </h1>
          </div>

          <Button
            size="3"
            variant="surface"
            color="cyan"
            highContrast
            className="w-fit"
          >
            <Link href="/issues/new" className="text-inherit no-underline">
              New Issue
            </Link>
          </Button>
        </div>

        <IssueSearch initialIssues={issues} />
      </div>
    </div>
  );
}
