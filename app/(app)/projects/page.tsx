import Link from "next/link";
import type { Metadata } from "next";
import { FolderKanban, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/access";
import { OPEN_STATUSES, ROLE_META, type Role } from "@/lib/constants";
import { EmptyState, ProjectBadge, TimeAgo } from "@/components/ui/bits";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const user = await requireUser();
  const memberships = await prisma.projectMember.findMany({
    where: { userId: user.id },
    orderBy: { project: { name: "asc" } },
    select: {
      role: true,
      project: {
        select: {
          key: true, name: true, description: true, color: true, updatedAt: true,
          _count: { select: { members: true, issues: { where: { status: { in: [...OPEN_STATUSES] } } } } },
        },
      },
    },
  });

  return (
    <>
      <PageHeader title="Projects">
        <Link href="/projects/new" className="btn-primary">
          <Plus className="h-4 w-4" /> New project
        </Link>
      </PageHeader>
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        {memberships.length === 0 ? (
          <div className="card">
            <EmptyState icon={<FolderKanban className="h-5 w-5" />} title="Create your first project">
              Projects hold issues, labels and members. Each one gets a short key like <code>API</code>, so issues read as API-1, API-2…
              <div className="mt-4">
                <Link href="/projects/new" className="btn-primary">New project</Link>
              </div>
            </EmptyState>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {memberships.map(({ role, project: p }, i) => (
              <Link
                key={p.key}
                href={`/projects/${p.key}/board`}
                className="card animate-fade-up group flex flex-col p-4 transition-colors hover:border-line-strong"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="flex items-center gap-2.5">
                  <ProjectBadge projectKey={p.key} color={p.color} size={28} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold group-hover:text-accent">{p.name}</p>
                    <p className="font-mono text-[11px] text-faint">{p.key}</p>
                  </div>
                  <span className="chip ml-auto h-5 text-[11px]">{ROLE_META[role as Role].label}</span>
                </div>
                <p className="mt-3 line-clamp-2 min-h-10 text-[13px] text-muted">{p.description || "No description."}</p>
                <div className="mt-4 flex items-center gap-3 text-xs text-faint">
                  <span><span className="font-semibold text-fg">{p._count.issues}</span> open</span>
                  <span>{p._count.members} {p._count.members === 1 ? "member" : "members"}</span>
                  <span className="ml-auto">Updated <TimeAgo date={p.updatedAt} /></span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
