import { prisma } from "@/lib/db";
import { projectAccess } from "@/lib/access";
import { buildOrderBy, buildWhere, parseFilters } from "@/lib/issue-filters";
import { toCsv } from "@/lib/csv";
import { issueKey } from "@/lib/constants";

/** CSV export of a project's issues, honouring the list view's filters. */
export async function GET(request: Request, ctx: RouteContext<"/api/projects/[key]/export">) {
  const { key } = await ctx.params;
  const access = await projectAccess(key);
  if (!access) return new Response("Not found", { status: 404 });

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const filters = parseFilters(params);
  const issues = await prisma.issue.findMany({
    where: buildWhere(access.project.id, filters, access.user.id),
    orderBy: buildOrderBy(filters.sort),
    take: 10_000,
    include: {
      assignee: { select: { name: true } },
      reporter: { select: { name: true } },
      labels: { select: { name: true } },
    },
  });

  const csv = toCsv(
    ["Key", "Title", "Status", "Priority", "Type", "Assignee", "Reporter", "Labels", "Due", "Estimate", "Source", "Occurrences", "Created", "Updated", "Closed"],
    issues.map((i) => [
      issueKey(access.project.key, i.number),
      i.title,
      i.status,
      i.priority,
      i.type,
      i.assignee?.name,
      i.reporter?.name,
      i.labels.map((l) => l.name).join("; "),
      i.dueDate?.toISOString().slice(0, 10),
      i.estimate,
      i.source,
      i.occurrences,
      i.createdAt,
      i.updatedAt,
      i.closedAt,
    ]),
  );

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${access.project.key}-issues-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
