"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema } from "@/lib/validationSchemas";
import { z } from "zod";
import Link from "next/link";
import { requestPasswordReset } from "@/actions/auth";
import ErrorMessage from "@/components/ErrorMessage";
import { motion } from "framer-motion";
import { Mail, CheckCircle2, ArrowLeft } from "lucide-react";

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

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
              Forgot your password?
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Enter your email and we&apos;ll send you a secure reset link.
            </p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-800 dark:text-slate-300" htmlFor="reset-email">
                Email address
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-200/80 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus-ring dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-500"
                  {...register("email")}
                />
              </div>
              <ErrorMessage>{errors.email?.message}</ErrorMessage>
            </div>

            <motion.button
              type="submit"
              disabled={isPending}
              className="btn-primary inline-flex w-full items-center justify-center rounded-xl px-6 py-2.5 text-sm font-semibold shadow-md shadow-cyan-500/20 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {isPending ? "Sending…" : "Send reset link"}
            </motion.button>
          </form>

          {message && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-sm font-medium ${
                status === "sent"
                  ? "border border-emerald-200/80 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400"
                  : "border border-rose-200/80 bg-rose-50/80 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400"
              }`}
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
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
