"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, X } from "lucide-react";
import { createLabel, deleteLabel } from "@/actions/projects";
import { PROJECT_COLORS } from "@/lib/constants";
import { LabelChip } from "@/components/ui/bits";

export default function LabelsSettings({ projectId, labels }: { projectId: string; labels: { id: string; name: string; color: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(PROJECT_COLORS[labels.length % PROJECT_COLORS.length]);

  return (
    <div className="card flex flex-col gap-3 p-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const res = await createLabel(projectId, { name, color });
            if (!res.ok) return void toast.error(res.error);
            setName("");
            setColor(PROJECT_COLORS[(labels.length + 1) % PROJECT_COLORS.length]);
            router.refresh();
          });
        }}
      >
        <label className="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-line" title="Label colour">
          <span className="h-3.5 w-3.5 rounded-full" style={{ background: color }} />
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Label colour" />
        </label>
        <input className="input" placeholder="New label, e.g. payments" value={name} maxLength={32} onChange={(e) => setName(e.target.value)} aria-label="Label name" />
        <button className="btn-secondary h-9" disabled={pending || !name.trim()}>
          <Plus className="h-4 w-4" /> Add
        </button>
      </form>
      {labels.length === 0 ? (
        <p className="text-xs text-faint">No labels yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {labels.map((l) => (
            <li key={l.id} className="group flex items-center">
              <LabelChip name={l.name} color={l.color} />
              <button
                className="ml-0.5 rounded p-0.5 text-faint opacity-60 hover:bg-surface-2 hover:text-danger group-hover:opacity-100"
                aria-label={`Delete label ${l.name}`}
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const res = await deleteLabel(l.id);
                    if (!res.ok) return void toast.error(res.error);
                    router.refresh();
                  })
                }
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
