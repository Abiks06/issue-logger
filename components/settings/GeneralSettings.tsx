"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { updateProject } from "@/actions/projects";
import { Field, firstErrors } from "@/components/ui/Field";
import ColorSwatches from "@/components/ui/ColorSwatches";

type Project = { id: string; key: string; name: string; description: string; color: string };

export default function GeneralSettings({ project }: { project: Project }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [color, setColor] = useState(project.color);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = name !== project.name || description !== project.description || color !== project.color;

  return (
    <form
      className="card flex flex-col gap-4 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await updateProject(project.id, { name, description, color });
          if (!res.ok) {
            setErrors(firstErrors(res.fieldErrors));
            return void toast.error(res.error);
          }
          setErrors({});
          toast.success("Project updated");
          router.refresh();
        });
      }}
    >
      <Field id="project-name" label="Name" error={errors.name}>
        <input id="project-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field id="project-key" label="Key">
        <input id="project-key" className="input font-mono" value={project.key} disabled />
      </Field>
      <Field id="project-description" label="Description" error={errors.description}>
        <textarea id="project-description" className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <div>
        <span className="label">Colour</span>
        <ColorSwatches value={color} onChange={setColor} />
      </div>
      <div className="flex justify-end">
        <button className="btn-primary" disabled={!dirty || pending}>{pending ? "Saving…" : "Save changes"}</button>
      </div>
    </form>
  );
}
