"use client";

import { Suspense, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { resendVerificationEmail } from "@/actions/auth";
import { motion } from "framer-motion";
import { MailOpen, Send, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const }}
      className="glass-card rounded-2xl p-6 sm:p-8 text-center"
    >
      <motion.div
        className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-400"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
      >
        <MailOpen className="h-8 w-8" />
      </motion.div>

      <h1 className="mb-3 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
        Check your email
      </h1>

      <p className="mb-6 text-slate-500 dark:text-slate-400 leading-relaxed text-sm">
        We&apos;ve sent a verification link to{" "}
        {email ? (
          <strong className="font-semibold text-slate-800 dark:text-slate-200">{email}</strong>
        ) : (
          "your email address"
        )}
        . Please click the link in the email to activate your account.
      </p>

      {status && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 flex items-center justify-center gap-2 rounded-xl p-3.5 text-xs font-medium ${
            status.type === "success"
              ? "border border-emerald-200/80 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border border-rose-200/80 bg-rose-50/80 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
          }`}
        >
          {status.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{status.message}</span>
        </motion.div>
      )}

      <div className="flex flex-col gap-3">
        {email && (
          <motion.button
            onClick={handleResend}
            disabled={isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer disabled:cursor-not-allowed"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Send className="h-3.5 w-3.5" />
            {isPending ? "Resending email…" : "Resend verification email"}
          </motion.button>
        )}

        <Link
          href="/auth/login"
          className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold shadow-md shadow-cyan-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    </motion.div>
  );
}

export default function VerifyRequestPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-3 py-6 sm:px-4 sm:py-12">
      {/* Glow backdrop */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-gradient-to-br from-cyan-400/15 to-blue-500/8 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-gradient-to-tl from-violet-400/8 to-fuchsia-500/4 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <Suspense
          fallback={
            <div className="glass-card rounded-2xl p-8 text-center">
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
