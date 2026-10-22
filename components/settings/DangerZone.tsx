"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { deleteProject } from "@/actions/projects";
import ConfirmButton from "@/components/ui/ConfirmButton";

export default function DangerZone({ projectId, projectKey }: { projectId: string; projectKey: string }) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-danger/30 bg-danger-soft p-4">
      <p className="text-[13px] text-fg">Permanently delete this project and everything in it.</p>
      <ConfirmButton
        title={`Delete ${projectKey}?`}
        description={<>This deletes all issues, comments, labels and API keys. Type <b className="font-mono">{projectKey}</b> to confirm.</>}
        confirmText={projectKey}
        confirmLabel="Delete project"
        onConfirm={async () => {
          const res = await deleteProject(projectId, projectKey);
          if (!res.ok) return void toast.error(res.error);
          toast.success("Project deleted");
          router.push("/projects");
          router.refresh();
        }}
      >
        Delete project
      </ConfirmButton>
    </div>
  );
}
