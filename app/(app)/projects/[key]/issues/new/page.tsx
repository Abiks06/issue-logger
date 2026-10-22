import type { Metadata } from "next";
import { requireProject } from "@/lib/access";
import { projectLabels, projectMembers } from "@/lib/queries";
import { STATUSES, type Status } from "@/lib/constants";
import IssueForm from "@/components/issues/IssueForm";

export const metadata: Metadata = { title: "New issue" };

export default async function NewIssuePage({ params, searchParams }: PageProps<"/projects/[key]/issues/new">) {
  const { key } = await params;
  const { status } = await searchParams;
  const { project, user } = await requireProject(key, "issue:write");
  const [members, labels] = await Promise.all([projectMembers(project.id), projectLabels(project.id)]);
  const initialStatus = (STATUSES as readonly string[]).includes(String(status)) ? (status as Status) : "TODO";

  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <IssueForm
        projectId={project.id}
        projectKey={project.key}
        members={members.map((m) => m.user)}
        labels={labels}
        meId={user.id}
        initialStatus={initialStatus}
      />
    </div>
  );
}
