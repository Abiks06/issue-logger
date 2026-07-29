import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import EditIssueForm from "./EditIssueForm";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const issue = await prisma.issue.findUnique({ where: { id: Number(id) } });
  return { title: issue ? `Edit: ${issue.title}` : "Edit Issue" };
}

export default async function EditIssuePage({ params }: Props) {
  const { id } = await params;
  const issue = await prisma.issue.findUnique({ where: { id: Number(id) } });

  if (!issue) notFound();

  return <EditIssueForm issue={issue} />;
}
