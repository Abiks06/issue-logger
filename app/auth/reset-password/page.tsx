"use client";

import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPasswordSchema } from "@/lib/validation";
import { resetPassword } from "@/actions/auth";
import { Field, FormAlert, describedBy, firstErrors } from "@/components/ui/Field";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  if (!token) {
    return (
      <FormAlert>
        This reset link is incomplete. <Link href="/auth/forgot-password" className="underline">Request a new one</Link>.
      </FormAlert>
    );
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = resetPasswordSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    setError("");
    if (!parsed.success) {
      setErrors(firstErrors(parsed.error.flatten().fieldErrors));
      return;
    }
    setErrors({});
    startTransition(async () => {
      const res = await resetPassword(token, parsed.data);
      if (res.ok) router.push("/auth/login?reset=1");
      else setError(res.error);
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {error && <FormAlert>{error}</FormAlert>}
      <Field id="password" label="New password" error={errors.password}>
        <input id="password" name="password" type="password" autoComplete="new-password" autoFocus className="input" {...describedBy("password", errors.password)} />
      </Field>
      <Field id="confirmPassword" label="Confirm new password" error={errors.confirmPassword}>
        <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" className="input" {...describedBy("confirmPassword", errors.confirmPassword)} />
      </Field>
      <button type="submit" className="btn-primary h-9" disabled={pending}>
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="text-lg font-semibold">Choose a new password</h1>
      <p className="mb-6 mt-1 text-[13px] text-muted">At least 8 characters.</p>
      <Suspense>
        <ResetForm />
      </Suspense>
    </>
  );
}
