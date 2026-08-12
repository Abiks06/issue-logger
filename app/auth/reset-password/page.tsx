"use client";

import { useState, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema } from "@/lib/validationSchemas";
import { z } from "zod";
import { resetPassword } from "@/actions/auth";
import ErrorMessage from "@/components/ErrorMessage";
import { motion } from "framer-motion";
import { Lock, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

function ResetPasswordFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [message, setMessage] = useState(!token ? "Reset token is missing. Request a new password reset link." : "");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      setMessage("");

      if (!token) {
        setMessage("Reset token is missing. Request a new password reset link.");
        setIsSuccess(false);
        return;
      }

      const result = await resetPassword(token, data.password);
      setMessage(result.message || "");
      setIsSuccess(result.success);
      if (result.success) {
        setTimeout(() => router.push("/auth/login"), 1500);
      }
    });
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-3 py-6 sm:px-4 sm:py-12">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-gradient-to-br from-cyan-400/15 to-blue-500/8 blur-3xl" />
      </div>

      <motion.div
        className="relative w-full max-w-md"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={item} className="glass-card rounded-2xl p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
              Choose a new password
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Enter a new password for your account.
            </p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-800 dark:text-slate-300" htmlFor="new-password">
                New password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="new-password"
                  type="password"
                  className="w-full rounded-xl border border-slate-200/80 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus-ring dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-500"
                  {...register("password")}
                />
              </div>
              <ErrorMessage>{errors.password?.message}</ErrorMessage>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-800 dark:text-slate-300" htmlFor="confirm-password">
                Confirm password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="confirm-password"
                  type="password"
                  className="w-full rounded-xl border border-slate-200/80 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus-ring dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-500"
                  {...register("confirmPassword")}
                />
              </div>
              <ErrorMessage>{errors.confirmPassword?.message}</ErrorMessage>
            </div>

            <motion.button
              type="submit"
              disabled={isPending || !token}
              className="btn-primary inline-flex w-full items-center justify-center rounded-xl px-6 py-2.5 text-sm font-semibold shadow-md shadow-cyan-500/20 disabled:opacity-60"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {isPending ? "Updating…" : "Update password"}
            </motion.button>
          </form>

          {message && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-sm font-medium ${
                isSuccess
                  ? "border border-emerald-200/80 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400"
                  : "border border-rose-200/80 bg-rose-50/80 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400"
              }`}
            >
              {isSuccess ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              {message}
            </motion.div>
          )}

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            <Link href="/auth/login" className="inline-flex items-center gap-1 font-medium text-cyan-600 hover:text-cyan-700 hover:underline dark:text-cyan-400 dark:hover:text-cyan-300">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-cyan-500 dark:border-slate-700 dark:border-t-cyan-400" />
      </div>
    }>
      <ResetPasswordFormContent />
    </Suspense>
  );
}
