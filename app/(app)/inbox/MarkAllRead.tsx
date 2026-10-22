"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { markNotificationsRead } from "@/actions/issues";

export default function MarkAllRead() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="btn-secondary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markNotificationsRead("all");
          router.refresh();
        })
      }
    >
      <CheckCheck className="h-3.5 w-3.5" /> Mark all read
    </button>
  );
}
