import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireProject } from "@/lib/access";
import { can } from "@/lib/permissions";
import { issueRowSelect, projectSlaTargets } from "@/lib/queries";
import { daysAgo } from "@/lib/analytics";
import type { Status } from "@/lib/constants";
import Board from "@/components/board/Board";
import AutoRefresh from "@/components/AutoRefresh";

export const metadata: Metadata = { title: "Board" };

const COLUMNS: Status[] = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const DONE_WINDOW_DAYS = 14;

export default async function BoardPage({ params }: PageProps<"/projects/[key]/board">) {
  const { key } = await params;
  const { project, role, user } = await requireProject(key);

  // Done work piles up forever; the board only shows what closed recently.
  const doneSince = daysAgo(DONE_WINDOW_DAYS);
  const issues = await prisma.issue.findMany({
    where: {
      projectId: project.id,
      OR: [{ status: { in: ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW"] } }, { status: "DONE", closedAt: { gte: doneSince } }],
    },
    orderBy: { position: "asc" },
    select: issueRowSelect,
  });

  return (
    <>
    <AutoRefresh />
    <Board
      projectId={project.id}
      projectKey={project.key}
      columns={COLUMNS}
      issues={issues}
      meId={user.id}
      canEdit={can(role, "issue:write")}
      columnNotes={{ DONE: `Closed in the last ${DONE_WINDOW_DAYS} days` }}
      wipLimits={(project.wipLimits ?? {}) as Partial<Record<Status, number>>}
      slaTargets={await projectSlaTargets(project.id)}
    />
    </>
  );
}
