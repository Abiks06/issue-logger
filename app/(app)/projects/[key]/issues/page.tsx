import type { Metadata } from "next";
import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireProject } from "@/lib/access";
import { can } from "@/lib/permissions";
import { PAGE_SIZE, buildOrderBy, buildWhere, filtersToQuery, hasActiveFilters, parseFilters } from "@/lib/issue-filters";
import { issueRowSelect, projectLabels, projectMembers, projectSlaTargets } from "@/lib/queries";
import FilterBar from "@/components/issues/FilterBar";
import IssueTable from "@/components/issues/IssueTable";
import SavedViews from "@/components/issues/SavedViews";
import AutoRefresh from "@/components/AutoRefresh";

export const metadata: Metadata = { title: "Issues" };

export default async function IssuesPage({ params, searchParams }: PageProps<"/projects/[key]/issues">) {
  const { key } = await params;
  const { project, role, user } = await requireProject(key);
  const filters = parseFilters(await searchParams);
  const slaTargets = await projectSlaTargets(project.id);
  const where = buildWhere(project.id, filters, user.id, slaTargets);

  const [total, issues, members, labels, views] = await Promise.all([
    prisma.issue.count({ where }),
    prisma.issue.findMany({
      where,
      orderBy: buildOrderBy(filters.sort),
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: issueRowSelect,
    }),
    projectMembers(project.id),
    projectLabels(project.id),
    prisma.savedView.findMany({
      where: { projectId: project.id, userId: user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, query: true },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const base = `/projects/${project.key}/issues`;
  const canEdit = can(role, "issue:write");

  return (
    <div className="flex flex-col">
      <AutoRefresh />
      <div className="px-4 pt-3 sm:px-6">
        <SavedViews projectId={project.id} basePath={base} views={views} currentQuery={filtersToQuery(filters, { page: 1 })} />
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 pt-2 sm:px-6">
        <FilterBar
          filters={filters}
          members={members.map((m) => m.user)}
          labels={labels}
          meId={user.id}
        />
        <div className="ml-auto flex items-center gap-2">
          <a href={`/api/projects/${project.key}/export${filtersToQuery(filters, { page: 1 })}`} className="btn-secondary" download>
            <Download className="h-3.5 w-3.5" /> CSV
          </a>
          {canEdit && (
            <Link href={`${base}/new`} className="btn-primary">
              <Plus className="h-4 w-4" /> New issue
            </Link>
          )}
        </div>
      </div>

      <IssueTable
        key={JSON.stringify(filters)}
        projectId={project.id}
        projectKey={project.key}
        issues={issues}
        members={members.map((m) => m.user)}
        meId={user.id}
        canEdit={canEdit}
        canDeleteAny={can(role, "issue:delete")}
        total={total}
        filtered={hasActiveFilters(filters)}
        slaTargets={slaTargets}
      />

      {pages > 1 && (
        <nav className="flex items-center justify-between px-4 pb-6 text-[13px] text-muted sm:px-6" aria-label="Pagination">
          <span>
            {(filters.page - 1) * PAGE_SIZE + 1}–{Math.min(filters.page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-2">
            {filters.page > 1 ? (
              <Link className="btn-secondary" href={`${base}${filtersToQuery(filters, { page: filters.page - 1 })}`}>Previous</Link>
            ) : (
              <span className="btn-secondary opacity-50">Previous</span>
            )}
            {filters.page < pages ? (
              <Link className="btn-secondary" href={`${base}${filtersToQuery(filters, { page: filters.page + 1 })}`}>Next</Link>
            ) : (
              <span className="btn-secondary opacity-50">Next</span>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
