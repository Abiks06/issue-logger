"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { loginSchema } from "@/lib/validation";
import { resendVerificationEmail } from "@/actions/auth";
import { Field, FormAlert, describedBy, firstErrors } from "@/components/ui/Field";

export default function LoginForm({ next, notice }: { next: string; notice: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const remember = form.get("remember") === "on";
    const parsed = loginSchema.safeParse(Object.fromEntries(form));
    setError("");
    setUnverifiedEmail(null);
    if (!parsed.success) {
      setErrors(firstErrors(parsed.error.flatten().fieldErrors));
      return;
    }
    setErrors({});

    startTransition(async () => {
      const result = await signIn("credentials", { ...parsed.data, remember: String(remember), redirect: false });
      const code = result?.code ?? result?.error ?? "";
      if (!result?.error) {
        router.push(next);
        router.refresh();
      } else if (code.includes("EMAIL_NOT_VERIFIED")) {
        setUnverifiedEmail(parsed.data.email);
      } else if (result.error === "Configuration") {
        // Auth.js reports unexpected server errors (e.g. the database is down) this way.
        setError("Sign-in is unavailable right now: the server couldn't reach its database. Try again in a moment.");
      } else if (code.includes("TOO_MANY_ATTEMPTS")) {
        setError("Too many sign-in attempts. Wait a few minutes and try again.");
      } else {
        setError("Incorrect email or password.");
      }
    });
  };

  const resend = () =>
    startTransition(async () => {
      if (!unverifiedEmail) return;
      const res = await resendVerificationEmail({ email: unverifiedEmail });
      if (res.ok) setResent(true);
      else setError(res.error);
    });

  return (
    <>
      <h1 className="text-lg font-semibold">Sign in</h1>
      <p className="mt-1 text-[13px] text-muted">Welcome back. Pick up where your team left off.</p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        {notice && <FormAlert tone="success">{notice}</FormAlert>}
        {error && <FormAlert>{error}</FormAlert>}
        {unverifiedEmail && (
          <FormAlert>
            Verify your email before signing in.{" "}
            {resent ? (
              "A new link is on its way."
            ) : (
              <button type="button" onClick={resend} className="font-medium underline underline-offset-2">
                Resend the link
              </button>
            )}
          </FormAlert>
        )}

        <Field id="email" label="Email" error={errors.email}>
          <input id="email" name="email" type="email" autoComplete="email" className="input" autoFocus {...describedBy("email", errors.email)} />
        </Field>
        <Field
          id="password"
          label="Password"
          error={errors.password}
          hint={
            <Link href="/auth/forgot-password" className="text-xs text-muted hover:text-fg">
              Forgot password?
            </Link>
          }
        >
          <input id="password" name="password" type="password" autoComplete="current-password" className="input" {...describedBy("password", errors.password)} />
        </Field>

        <label className="-mt-1 flex items-start gap-2 text-[13px] text-muted">
          <input type="checkbox" name="remember" defaultChecked className="mt-0.5 accent-[var(--accent)]" />
          <span>
            Keep me signed in
            <span className="block text-xs text-faint">Untick on a shared computer: you&apos;ll be signed out after 12 hours of inactivity.</span>
          </span>
        </label>

        <button type="submit" className="btn-primary mt-1 h-9" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted">
        New here?{" "}
        <Link href="/auth/register" className="font-medium text-fg hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
