"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { addComment } from "@/actions/issues";
import { handleFor } from "@/lib/constants";
import MarkdownEditor from "@/components/ui/MarkdownEditor";

export default function CommentComposer({ issueId, handles }: { issueId: string; handles: { name: string; email: string }[] }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!body.trim() || pending) return;
    startTransition(async () => {
      const res = await addComment(issueId, { body });
      if (!res.ok) return void toast.error(res.error);
      setBody("");
      router.refresh();
    });
  };

  return (
    <div className="mt-6 flex flex-col gap-2">
      <MarkdownEditor value={body} onChange={setBody} rows={4} placeholder="Leave a comment… (⌘/Ctrl+Enter to send)" onSubmit={submit} />
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-[11px] text-faint">
          Mention teammates:{" "}
          {handles.slice(0, 6).map((h, i) => (
            <button
              key={h.email}
              type="button"
              className="font-mono hover:text-accent"
              title={h.name}
              onClick={() => setBody((b) => `${b}${b && !b.endsWith(" ") ? " " : ""}@${handleFor(h.email)} `)}
            >
              @{handleFor(h.email)}{i < Math.min(handles.length, 6) - 1 ? ", " : ""}
            </button>
          ))}
        </p>
        <button className="btn-primary" onClick={submit} disabled={pending || !body.trim()}>
          {pending ? "Sending…" : "Comment"}
        </button>
      </div>
    </div>
  );
}
