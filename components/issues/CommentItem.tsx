"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Pencil } from "lucide-react";
import { editComment } from "@/actions/issues";
import { Avatar, Markdown, TimeAgo } from "@/components/ui/bits";
import MarkdownEditor, { type Mentionable } from "@/components/ui/MarkdownEditor";
import DeleteCommentButton from "@/components/issues/DeleteCommentButton";

type Props = {
  id: string;
  author: string | null;
  body: string;
  createdAt: Date;
  edited: boolean;
  canEdit: boolean;
  canDelete: boolean;
  mentions: Mentionable[];
};

export default function CommentItem({ id, author, body, createdAt, edited, canEdit, canDelete, mentions }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      if (!draft.trim()) return void toast.error("Comment can't be empty");
      const res = await editComment(id, { body: draft });
      if (!res.ok) return void toast.error(res.error);
      setEditing(false);
      router.refresh();
    });

  return (
    <li id={`comment-${id}`} className="relative flex scroll-mt-24 gap-3">
      <Avatar name={author ?? "Deleted user"} size={20} className="relative ring-4 ring-bg" />
      <div className="card group min-w-0 flex-1">
        <div className="flex items-center gap-2 border-b border-line px-3 py-1.5 text-xs">
          <span className="font-medium">{author ?? "Deleted user"}</span>
          <a href={`#comment-${id}`} className="text-faint hover:text-muted"><TimeAgo date={createdAt} /></a>
          {edited && <span className="text-faint">· edited</span>}
          <span className="ml-auto flex items-center opacity-70 transition-opacity group-hover:opacity-100">
            {canEdit && !editing && (
              <button
                className="btn-icon h-6 w-6"
                aria-label="Edit comment"
                onClick={() => {
                  setDraft(body);
                  setEditing(true);
                }}
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
            {canDelete && <DeleteCommentButton commentId={id} />}
          </span>
        </div>
        {editing ? (
          <div className="flex flex-col gap-2 p-2" onKeyDown={(e) => e.key === "Escape" && setEditing(false)}>
            <MarkdownEditor value={draft} onChange={setDraft} rows={4} onSubmit={save} mentions={mentions} autoFocus />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary h-7" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn-primary h-7" onClick={save} disabled={pending}>{pending ? "Saving…" : "Save"}</button>
            </div>
          </div>
        ) : (
          <div className="px-3 py-2.5">
            <Markdown>{body}</Markdown>
          </div>
        )}
      </div>
    </li>
  );
}
