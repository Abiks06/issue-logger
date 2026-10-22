"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createProject } from "@/actions/projects";
import { projectSchema } from "@/lib/validation";
import { PROJECT_COLORS } from "@/lib/constants";
import { Field, FormAlert, describedBy, firstErrors } from "@/components/ui/Field";
import { ProjectBadge } from "@/components/ui/bits";
import ColorSwatches from "@/components/ui/ColorSwatches";

/** Suggest a key from the name: initials for multi-word names, else the first letters. */
function suggestKey(name: string) {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const key = words.length > 1 ? words.map((w) => w[0]).join("") : words[0];
  return key.replace(/^[0-9]+/, "").slice(0, words.length > 1 ? 6 : 3);
}

export default function ProjectForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(PROJECT_COLORS[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const effectiveKey = keyTouched ? key : suggestKey(name);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = projectSchema.safeParse({ name, key: effectiveKey, description, color });
    setError("");
    if (!parsed.success) {
      setErrors(firstErrors(parsed.error.flatten().fieldErrors));
      return;
    }
    setErrors({});
    startTransition(async () => {
      const res = await createProject(parsed.data);
      if (!res.ok) {
        setError(res.error);
        setErrors(firstErrors(res.fieldErrors));
        return;
      }
      toast.success("Project created");
      router.push(`/projects/${res.data.key}/board`);
    });
  };

  return (
    <form onSubmit={onSubmit} className="card flex flex-col gap-5 p-5" noValidate>
      {error && <FormAlert>{error}</FormAlert>}
      <div className="flex items-center gap-3">
        <ProjectBadge projectKey={effectiveKey || "?"} color={color} size={40} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name || "Untitled project"}</p>
          <p className="font-mono text-xs text-faint">{effectiveKey ? `${effectiveKey}-1, ${effectiveKey}-2…` : "Issue keys appear here"}</p>
        </div>
      </div>

      <Field id="name" label="Name" error={errors.name}>
        <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Payments API" {...describedBy("name", errors.name)} />
      </Field>
      <Field id="key" label="Key" error={errors.key} hint={<span className="text-xs text-faint">Can&apos;t be changed later</span>}>
        <input
          id="key"
          className="input font-mono uppercase"
          value={effectiveKey}
          maxLength={6}
          onChange={(e) => {
            setKeyTouched(true);
            setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
          }}
          placeholder="PAY"
          {...describedBy("key", errors.key)}
        />
      </Field>
      <Field id="description" label="Description" error={errors.description}>
        <textarea id="description" className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this project track?" />
      </Field>
      <div>
        <span className="label">Colour</span>
        <ColorSwatches value={color} onChange={setColor} />
      </div>

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Creating…" : "Create project"}</button>
      </div>
    </form>
  );
}
