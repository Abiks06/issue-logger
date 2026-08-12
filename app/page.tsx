import Link from "next/link";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import type { Issue } from "@prisma/client";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = { title: "Dashboard" };

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  const userId = parseInt(session.user.id, 10);

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

  return (
    <DashboardClient
      issues={issues}
      totalIssues={totalIssues}
      openIssues={openIssues}
      inProgressIssues={inProgressIssues}
      closedIssues={closedIssues}
    />
  );
}
