"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { addComment } from "@/actions/issues";
import MarkdownEditor, { type Mentionable } from "@/components/ui/MarkdownEditor";

export default function CommentComposer({ issueId, mentions }: { issueId: string; mentions: Mentionable[] }) {
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
      <MarkdownEditor
        value={body}
        onChange={setBody}
        rows={4}
        placeholder="Leave a comment… type @ to mention someone (⌘/Ctrl+Enter to send)"
        onSubmit={submit}
        mentions={mentions}
      />
      <div className="flex justify-end">
        <button className="btn-primary" onClick={submit} disabled={pending || !body.trim()}>
          {pending ? "Sending…" : "Comment"}
        </button>
      </div>
    </div>
  );
}
