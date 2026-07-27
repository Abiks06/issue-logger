import Link from "next/link";
import { Button, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { prisma } from "@/lib/db";

export default async function HomePage() {
  const issues = await prisma.issue.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const totalIssues = await prisma.issue.count();
  const openIssues = await prisma.issue.count({ where: { status: "OPEN" } });
  const inProgressIssues = await prisma.issue.count({ where: { status: "IN_PROGRESS" } });
  const closedIssues = await prisma.issue.count({ where: { status: "CLOSED" } });

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_24px_70px_-24px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-400">
              Operations Overview
            </p>
            <Heading as="h1" size="8" className="mt-2 text-slate-900 dark:text-slate-50">
              Stay on top of every issue.
            </Heading>
            <Text size="4" className="mt-3 block leading-7 text-slate-600 dark:text-slate-400">
              A modern summary of your current workload, progress, and the latest problems that need attention.
            </Text>
          </div>

          <Button size="3" color="cyan" highContrast>
            <Link href="/issues/new" className="text-inherit no-underline">
              Create New Issue
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Issues", value: totalIssues, accent: "cyan" },
            { label: "Open", value: openIssues, accent: "tomato" },
            { label: "In Progress", value: inProgressIssues, accent: "amber" },
            { label: "Closed", value: closedIssues, accent: "green" },
          ].map((stat) => (
            <Card key={stat.label} size="2" className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <Flex direction="column" gap="2">
                <Text size="2" className="uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  {stat.label}
                </Text>
                <Heading as="h2" size="7" className="text-slate-900 dark:text-slate-50">
                  {stat.value}
                </Heading>
              </Flex>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card size="3" className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <Text size="2" className="uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
                  Recent Issues
                </Text>
                <Heading as="h3" size="5" className="mt-1 text-slate-900 dark:text-slate-100">
                  Latest updates
                </Heading>
              </div>
              <Link href="/issues" className="text-sm font-medium text-cyan-600 hover:underline dark:text-cyan-400">
                View all
              </Link>
            </div>

            <div className="flex flex-col gap-3">
              {issues.map((issue) => (
                <div key={issue.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100">{issue.title}</h4>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {issue.description.slice(0, 90)}{issue.description.length > 90 ? "..." : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                      {issue.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card size="3" className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Text size="2" className="uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
              Quick Actions
            </Text>
            <div className="mt-5 flex flex-col gap-3">
              <Link href="/issues/new" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-cyan-400 hover:bg-cyan-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-cyan-500 dark:hover:bg-slate-800">
                <p className="font-semibold text-slate-900 dark:text-slate-100">Open a new issue</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Capture bugs, requests, or tasks from the team.</p>
              </Link>
              <Link href="/issues" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-cyan-400 hover:bg-cyan-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-cyan-500 dark:hover:bg-slate-800">
                <p className="font-semibold text-slate-900 dark:text-slate-100">Review all issues</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Browse the full backlog and filter by status.</p>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
