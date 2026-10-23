import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { targetsFromRows } from "@/lib/sla";

// Read helpers shared by several pages, deduped per request.

export const projectMembers = cache(async (projectId: string) => {
  const rows = await prisma.projectMember.findMany({
    where: { projectId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: { id: true, role: true, createdAt: true, user: { select: { id: true, name: true, email: true } } },
  });
  return rows;
});

export const projectSlaTargets = cache(async (projectId: string) =>
  targetsFromRows(await prisma.slaTarget.findMany({ where: { projectId } })),
);

export const projectLabels = cache((projectId: string) =>
  prisma.label.findMany({ where: { projectId }, orderBy: { name: "asc" }, select: { id: true, name: true, color: true } }),
);

/** Fields every issue row/card needs. */
export const issueRowSelect = {
  id: true,
  number: true,
  title: true,
  status: true,
  priority: true,
  type: true,
  position: true,
  dueDate: true,
  source: true,
  occurrences: true,
  createdAt: true,
  updatedAt: true,
  assignee: { select: { id: true, name: true } },
  labels: { select: { id: true, name: true, color: true }, orderBy: { name: "asc" } },
  _count: { select: { comments: true } },
  children: { select: { status: true } },
  firstResponseAt: true,
  closedAt: true,
} satisfies Prisma.IssueSelect;

export type IssueRow = Prisma.IssueGetPayload<{ select: typeof issueRowSelect }>;
