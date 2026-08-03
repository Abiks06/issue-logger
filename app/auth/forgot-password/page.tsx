"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema } from "@/lib/validationSchemas";
import { z } from "zod";
import Link from "next/link";
import { requestPasswordReset } from "@/actions/auth";
import ErrorMessage from "@/components/ErrorMessage";

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      setStatus("idle");
      setMessage("");

      const result = await requestPasswordReset(data.email);
      setStatus("sent");
      setMessage(
        result.success
          ? "If an account exists for that email, a reset link has been sent."
          : "Something went wrong. Please try again."
      );
    });
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-[#fcfbf8] p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
            Forgot your password?
          </h1>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-400">
            Enter your email and we&apos;ll send you a secure reset link.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-800 dark:text-slate-300" htmlFor="reset-email">
              Email address
            </label>
            <input
              id="reset-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-xl border border-slate-200 bg-[#f8f4ec] px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              {...register("email")}
            />
            <ErrorMessage>{errors.email?.message}</ErrorMessage>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex w-full items-center justify-center rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 transition-all hover:brightness-110 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
          >
            {isPending ? "Sending…" : "Send reset link"}
          </button>
        </form>

        {message ? (
          <p className={`mt-4 text-sm ${status === "sent" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
            {message}
          </p>
        ) : null}

        <p className="mt-6 text-center text-sm text-slate-700 dark:text-slate-400">
          <Link href="/auth/login" className="font-medium text-cyan-700 hover:underline dark:text-cyan-400">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
