import Link from "next/link";
import { prisma } from "@/lib/db";
import IssueSearch from "@/components/IssueSearch";
import type { Metadata } from "next";
import type { Issue } from "@prisma/client";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import IssuesPageClient from "./IssuesPageClient";

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

  return <IssuesPageClient issues={issues} />;
}
