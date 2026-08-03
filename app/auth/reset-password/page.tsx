"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/app/actions/auth";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    setToken(searchParams.get("token") || "");
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setMessage("");

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      setIsPending(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      setIsPending(false);
      return;
    }

    const result = await resetPassword(token, password);
    setMessage(result.message || "");
    setIsSuccess(result.success);
    if (result.success) {
      setTimeout(() => router.push("/auth/login"), 1500);
    }
    setIsPending(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-[#fcfbf8] p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
            Choose a new password
          </h1>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-400">
            Enter a new password for your account.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="text-sm font-medium text-slate-800 dark:text-slate-300" htmlFor="new-password">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-[#f8f4ec] px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
          />

          <label className="text-sm font-medium text-slate-800 dark:text-slate-300" htmlFor="confirm-password">
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-[#f8f4ec] px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
          />

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex w-full items-center justify-center rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 transition-all hover:brightness-110 disabled:opacity-60"
          >
            {isPending ? "Updating…" : "Update password"}
          </button>
        </form>

        {message ? (
          <p className={`mt-4 text-sm ${isSuccess ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
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
