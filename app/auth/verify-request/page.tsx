"use client";

import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import { resendVerificationEmail } from "@/actions/auth";
import { FormAlert } from "@/components/ui/Field";

function Resend() {
  const email = useSearchParams().get("email") ?? "";
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  return (
    <>
      <p className="mt-1 text-[13px] text-muted">
        We sent a verification link{email && <> to <span className="font-medium text-fg">{email}</span></>}. It expires in 24 hours.
      </p>
      {message && <div className="mt-4"><FormAlert tone={message.tone}>{message.text}</FormAlert></div>}
      {email && (
        <button
          className="btn-secondary mt-6 h-9 w-full"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await resendVerificationEmail({ email });
              setMessage(res.ok ? { tone: "success", text: "Sent another link." } : { tone: "danger", text: res.error });
            })
          }
        >
          {pending ? "Sending…" : "Resend email"}
        </button>
      )}
    </>
  );
}

export default function VerifyRequestPage() {
  return (
    <>
      <MailCheck className="mb-3 h-6 w-6 text-accent" />
      <h1 className="text-lg font-semibold">Check your inbox</h1>
      <Suspense>
        <Resend />
      </Suspense>
      <p className="mt-6 text-center text-[13px] text-muted">
        <Link href="/auth/login" className="font-medium text-fg hover:underline">Back to sign in</Link>
      </p>
    </>
  );
}
