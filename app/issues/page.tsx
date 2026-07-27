import Link from "next/link";
import { Button, TextField } from "@radix-ui/themes";
import { prisma } from "@/lib/db";

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

        <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <TextField.Root
            placeholder="Search issues..."
            size="3"
            variant="surface"
            className="w-full"
          >
            <TextField.Slot>
              <span aria-hidden="true">🔍</span>
            </TextField.Slot>
          </TextField.Root>
        </div>

        <div className="flex flex-col gap-4">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {issue.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {issue.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

