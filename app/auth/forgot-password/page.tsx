"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { forgotPasswordSchema } from "@/lib/validation";
import { requestPasswordReset } from "@/actions/auth";
import { Field, FormAlert, describedBy } from "@/components/ui/Field";

export default function ForgotPasswordPage() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const [sent, setSent] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    setError("");
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message);
      return;
    }
    setFieldError(undefined);
    startTransition(async () => {
      const res = await requestPasswordReset(parsed.data);
      if (res.ok) setSent(true);
      else setError(res.error);
    });
  };

  return (
    <>
      <h1 className="text-lg font-semibold">Reset your password</h1>
      <p className="mt-1 text-[13px] text-muted">We&apos;ll email you a link to choose a new one.</p>

      {sent ? (
        <div className="mt-6">
          <FormAlert tone="success">If an account uses that email, a reset link is on its way. It expires in one hour.</FormAlert>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          {error && <FormAlert>{error}</FormAlert>}
          <Field id="email" label="Email" error={fieldError}>
            <input id="email" name="email" type="email" autoComplete="email" autoFocus className="input" {...describedBy("email", fieldError)} />
          </Field>
          <button type="submit" className="btn-primary h-9" disabled={pending}>
            {pending ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-[13px] text-muted">
        <Link href="/auth/login" className="font-medium text-fg hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
