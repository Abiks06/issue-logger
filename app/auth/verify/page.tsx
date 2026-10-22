"use client";

import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyEmail } from "@/actions/auth";
import { FormAlert } from "@/components/ui/Field";

// Verification needs a click rather than happening on page load, so link
// scanners in mail clients can't burn the single-use token.

function Verify() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  if (!token) return <FormAlert>This verification link is incomplete.</FormAlert>;

  return (
    <div className="flex flex-col gap-4">
      {error && <FormAlert>{error}</FormAlert>}
      <button
        className="btn-primary h-9"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await verifyEmail(token);
            if (res.ok) router.push("/auth/login?verified=1");
            else setError(res.error);
          })
        }
      >
        {pending ? "Verifying…" : "Verify my email"}
      </button>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <>
      <h1 className="text-lg font-semibold">Confirm your email</h1>
      <p className="mb-6 mt-1 text-[13px] text-muted">One click and your account is ready.</p>
      <Suspense>
        <Verify />
      </Suspense>
      <p className="mt-6 text-center text-[13px] text-muted">
        <Link href="/auth/login" className="font-medium text-fg hover:underline">Back to sign in</Link>
      </p>
    </>
  );
}
