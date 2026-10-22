"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerSchema } from "@/lib/validation";
import { registerUser } from "@/actions/auth";
import { Field, FormAlert, describedBy, firstErrors } from "@/components/ui/Field";

const FIELDS = [
  { id: "name", label: "Full name", type: "text", autoComplete: "name" },
  { id: "email", label: "Email", type: "email", autoComplete: "email" },
  { id: "password", label: "Password", type: "password", autoComplete: "new-password" },
  { id: "confirmPassword", label: "Confirm password", type: "password", autoComplete: "new-password" },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = registerSchema.safeParse(values);
    setError("");
    if (!parsed.success) {
      setErrors(firstErrors(parsed.error.flatten().fieldErrors));
      return;
    }
    setErrors({});

    startTransition(async () => {
      const res = await registerUser(parsed.data);
      if (!res.ok) {
        setError(res.error);
        setErrors(firstErrors(res.fieldErrors));
      } else if (res.data.verified) {
        router.push("/auth/login?verified=1");
      } else {
        router.push(`/auth/verify-request?email=${encodeURIComponent(parsed.data.email)}`);
      }
    });
  };

  return (
    <>
      <h1 className="text-lg font-semibold">Create your account</h1>
      <p className="mt-1 text-[13px] text-muted">Track issues, plan work and log errors from your services.</p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        {error && <FormAlert>{error}</FormAlert>}
        {FIELDS.map((f, i) => (
          <Field key={f.id} id={f.id} label={f.label} error={errors[f.id]}>
            <input
              id={f.id}
              name={f.id}
              type={f.type}
              autoComplete={f.autoComplete}
              autoFocus={i === 0}
              className="input"
              {...describedBy(f.id, errors[f.id])}
            />
          </Field>
        ))}
        <button type="submit" className="btn-primary mt-1 h-9" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-medium text-fg hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
