import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import EditIssueForm from "./EditIssueForm";
import type { Metadata } from "next";
import { auth } from "@/auth";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const issue = await prisma.issue.findUnique({ where: { id: Number(id) } });
  return { title: issue ? `Edit: ${issue.title}` : "Edit Issue" };
}

export default async function EditIssuePage({ params }: Props) {
  const session = await auth();
  const userId = session?.user?.id ? parseInt(session.user.id, 10) : -1;

  const { id } = await params;
  const issue = await prisma.issue.findUnique({ where: { id: Number(id) } });

  if (!issue || issue.userId !== userId) notFound();

  return <EditIssueForm issue={issue} />;
}
