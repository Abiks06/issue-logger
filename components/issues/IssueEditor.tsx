"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Pencil } from "lucide-react";
import { updateIssue } from "@/actions/issues";
import { Markdown } from "@/components/ui/bits";
import MarkdownEditor from "@/components/ui/MarkdownEditor";

/** Title and description, read-only until "Edit" is pressed. */
export default function IssueEditor({
  issueId,
  title,
  description,
  canEdit,
}: {
  issueId: string;
  title: string;
  description: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftBody, setDraftBody] = useState(description);
  const [pending, startTransition] = useTransition();

  const start = () => {
    setDraftTitle(title);
    setDraftBody(description);
    setEditing(true);
  };

  const save = () =>
    startTransition(async () => {
      if (!draftTitle.trim()) return void toast.error("Title is required");
      const res = await updateIssue(issueId, { title: draftTitle, description: draftBody });
      if (!res.ok) return void toast.error(res.error);
      setEditing(false);
      router.refresh();
    });

  if (editing) {
    return (
      <div
        className="flex flex-col gap-3"
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
        }}
      >
        <input
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          className="input h-10 text-lg font-semibold"
          aria-label="Title"
          autoFocus
        />
        <MarkdownEditor value={draftBody} onChange={setDraftBody} rows={14} onSubmit={save} placeholder="Add a description…" />
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="group">
      <div className="flex items-start gap-3">
        <h1 className="min-w-0 flex-1 text-xl font-semibold leading-snug tracking-tight sm:text-2xl">{title}</h1>
        {canEdit && (
          <button className="btn-ghost h-7 shrink-0 px-2 text-xs" onClick={start}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        )}
      </div>
      <div className="mt-4">
        {description.trim() ? (
          <Markdown>{description}</Markdown>
        ) : canEdit ? (
          <button onClick={start} className="text-sm text-faint hover:text-muted">Add a description…</button>
        ) : (
          <p className="text-sm text-faint">No description.</p>
        )}
      </div>
    </div>
  );
}
