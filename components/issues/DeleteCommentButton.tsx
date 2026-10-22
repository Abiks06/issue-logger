"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";
import { deleteComment } from "@/actions/issues";
import ConfirmButton from "@/components/ui/ConfirmButton";

export default function DeleteCommentButton({ commentId }: { commentId: string }) {
  const router = useRouter();
  return (
    <span className="ml-auto">
      <ConfirmButton
        className="btn-icon h-6 w-6"
        title="Delete comment?"
        description="This can't be undone."
        onConfirm={async () => {
          const res = await deleteComment(commentId);
          if (!res.ok) return void toast.error(res.error);
          router.refresh();
        }}
      >
        <Trash2 className="h-3 w-3" aria-label="Delete comment" />
      </ConfirmButton>
    </span>
  );
}
