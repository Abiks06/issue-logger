"use client";

import { Suspense, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FaEnvelopeOpenText, FaPaperPlane, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import { resendVerificationEmail } from "@/actions/auth";

function VerifyRequestContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleResend = () => {
    if (!email) return;
    setStatus(null);
    startTransition(async () => {
      try {
        const res = await resendVerificationEmail(email);
        if (res.success) {
          setStatus({
            type: "success",
            message: res.message || "A new verification email has been sent!",
          });
        } else {
          setStatus({
            type: "error",
            message: res.message || "Failed to resend email. Please try again later.",
          });
        }
      } catch (err) {
        setStatus({
          type: "error",
          message: "An error occurred while resending the email.",
        });
      }
    });
  };

  return (
    <div className="card-shadow-lg rounded-2xl border border-slate-200/80 bg-[#fcfbf8] p-8 dark:border-slate-800 dark:bg-slate-900 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400 shadow-inner">
        <FaEnvelopeOpenText className="text-3xl" />
      </div>

      <h1 className="mb-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
        Check your email
      </h1>

      <p className="mb-6 text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
        We&apos;ve sent a verification link to{" "}
        {email ? (
          <strong className="font-semibold text-slate-900 dark:text-slate-200">{email}</strong>
        ) : (
          "your email address"
        )}
        . Please click the link in the email to activate your account.
      </p>

      {status && (
        <div
          className={`mb-6 flex items-center justify-center gap-2 rounded-xl p-3.5 text-xs font-medium ${
            status.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
          }`}
        >
          {status.type === "success" ? <FaCheckCircle /> : <FaExclamationTriangle />}
          <span>{status.message}</span>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {email && (
          <button
            onClick={handleResend}
            disabled={isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <FaPaperPlane className="text-xs" />
            {isPending ? "Resending email…" : "Resend verification email"}
          </button>
        )}

        <Link
          href="/auth/login"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}

export default function VerifyRequestPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      {/* Glow backdrop */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-linear-to-br from-cyan-400/20 to-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-linear-to-tl from-violet-400/10 to-fuchsia-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <Suspense
          fallback={
            <div className="card-shadow-lg rounded-2xl border border-slate-200/80 bg-[#fcfbf8] p-8 text-center dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500">Loading verification details…</p>
            </div>
          }
        >
          <VerifyRequestContent />
        </Suspense>
      </div>
    </div>
  );
}
