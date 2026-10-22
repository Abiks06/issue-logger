import { requireProject } from "@/lib/access";
import ProjectTabs from "./ProjectTabs";
import { ProjectBadge } from "@/components/ui/bits";
import { can } from "@/lib/permissions";

export default async function ProjectLayout({ children, params }: LayoutProps<"/projects/[key]">) {
  const { key } = await params;
  const { project, role } = await requireProject(key);

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <div className="flex items-center gap-2.5 px-4 pt-3 sm:px-6">
          <ProjectBadge projectKey={project.key} color={project.color} size={22} />
          <h1 className="truncate text-[15px] font-semibold">{project.name}</h1>
          <span className="font-mono text-xs text-faint">{project.key}</span>
        </div>
        <ProjectTabs projectKey={project.key} canManage={can(role, "project:manage")} />
      </div>
      {children}
    </div>
  );
}
