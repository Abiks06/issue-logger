import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireProject } from "@/lib/access";
import { can } from "@/lib/permissions";
import { projectLabels, projectMembers } from "@/lib/queries";
import { appUrl } from "@/lib/mail";
import GeneralSettings from "@/components/settings/GeneralSettings";
import MembersSettings from "@/components/settings/MembersSettings";
import LabelsSettings from "@/components/settings/LabelsSettings";
import ApiKeysSettings from "@/components/settings/ApiKeysSettings";
import DangerZone from "@/components/settings/DangerZone";

export const metadata: Metadata = { title: "Project settings" };

function Section({ id, title, description, children }: { id: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section id={id} className="grid scroll-mt-28 gap-4 border-b border-line py-8 last:border-0 md:grid-cols-[220px_1fr]">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 text-[13px] text-muted">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default async function SettingsPage({ params }: PageProps<"/projects/[key]/settings">) {
  const { key } = await params;
  const { project, role, user } = await requireProject(key);
  const canManage = can(role, "project:manage");

  const [members, labels, apiKeys] = await Promise.all([
    projectMembers(project.id),
    projectLabels(project.id),
    canManage
      ? prisma.apiKey.findMany({
          where: { projectId: project.id },
          orderBy: [{ revokedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
          select: { id: true, name: true, prefix: true, createdAt: true, lastUsedAt: true, revokedAt: true, createdBy: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
      {canManage && (
        <Section id="general" title="General" description="Name, description and colour. The key is permanent.">
          <GeneralSettings project={{ id: project.id, key: project.key, name: project.name, description: project.description, color: project.color }} />
        </Section>
      )}
      <Section id="members" title="Members" description="Owners and admins manage the team. Roles control who can edit, triage and configure.">
        <MembersSettings
          projectId={project.id}
          members={members.map((m) => ({ id: m.id, role: m.role, joinedAt: m.createdAt, user: m.user }))}
          myRole={role}
          meId={user.id}
        />
      </Section>
      {canManage && (
        <>
          <Section id="labels" title="Labels" description="Tag issues by area, component or theme.">
            <LabelsSettings projectId={project.id} labels={labels} />
          </Section>
          <Section id="api" title="API keys" description="Let your services report errors straight into this project. Repeats are grouped into one issue.">
            <ApiKeysSettings projectId={project.id} apiKeys={apiKeys} endpoint={appUrl("/api/v1/events")} />
          </Section>
        </>
      )}
      {can(role, "project:delete") && (
        <Section id="danger" title="Danger zone" description="Deleting a project removes every issue, comment and key in it.">
          <DangerZone projectId={project.id} projectKey={project.key} />
        </Section>
      )}
    </div>
  );
}
