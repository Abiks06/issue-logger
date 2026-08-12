"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "@/lib/validationSchemas";
import { z } from "zod";
import { registerUser } from "@/actions/auth";
import Link from "next/link";
import ErrorMessage from "@/components/ErrorMessage";
import { motion } from "framer-motion";
import { Bug, AlertCircle, Mail, Lock, User } from "lucide-react";

type RegisterForm = z.infer<typeof registerSchema>;

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

function PasswordStrength({ password }: { password: string }) {
  const getStrength = (pw: string): { label: string; percent: number; color: string } => {
    if (!pw) return { label: "", percent: 0, color: "bg-slate-200" };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 1) return { label: "Weak", percent: 20, color: "bg-rose-500" };
    if (score <= 2) return { label: "Fair", percent: 40, color: "bg-amber-500" };
    if (score <= 3) return { label: "Good", percent: 65, color: "bg-yellow-500" };
    if (score <= 4) return { label: "Strong", percent: 85, color: "bg-emerald-500" };
    return { label: "Very strong", percent: 100, color: "bg-emerald-500" };
  };

  const strength = getStrength(password);
  if (!password) return null;

  return (
    <div className="mt-1.5 space-y-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <motion.div
          className={`h-full rounded-full ${strength.color}`}
          initial={{ width: 0 }}
          animate={{ width: `${strength.percent}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
      <p className={`text-[11px] font-medium ${strength.percent > 60 ? "text-emerald-600 dark:text-emerald-400" : strength.percent > 30 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}`}>
        {strength.label}
      </p>
    </div>
  );
}

export default function RegisterPage() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const password = watch("password", "");

  const onSubmit = handleSubmit(async (data) => {
    try {
      setError("");
      setIsSubmitting(true);
      const result = await registerUser(data);

      if (!result.success) {
        setIsSubmitting(false);
        const msg = result.errors
          ? Object.values(result.errors).flat().join(" ")
          : "Registration failed.";
        setError(msg);
        return;
      }

      window.location.href = `/auth/verify-request?email=${encodeURIComponent(data.email)}`;
    } catch (err) {
      setIsSubmitting(false);
      console.error("Registration error:", err);
      setError("An unexpected error occurred while creating your account. Please try again.");
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-3 py-6 sm:px-4 sm:py-12">
      {/* Glow backdrop */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-gradient-to-br from-cyan-400/15 to-blue-500/8 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-gradient-to-tl from-violet-400/8 to-fuchsia-500/4 blur-3xl" />
      </div>

      <motion.div
        className="relative w-full max-w-md"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        {/* Logo */}
        <motion.div variants={item} className="mb-6 flex flex-col items-center gap-2.5 sm:mb-8 sm:gap-3">
          <motion.span
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25 text-white"
            whileHover={{ scale: 1.05, rotate: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Bug className="h-5 w-5" />
          </motion.span>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
              Create your account
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
              Start tracking your issues in under a minute.
            </p>
          </div>
        </motion.div>

        {/* Card */}
        <motion.div variants={item} className="glass-card rounded-2xl p-5 sm:p-8">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-center gap-2 rounded-xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-name" className="text-sm font-medium text-slate-800 dark:text-slate-300">
                Full name
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <User className="h-4 w-4" />
                </span>
                <input
                  id="reg-name"
                  type="text"
                  placeholder="Jane Smith"
                  autoComplete="name"
                  className="w-full rounded-xl border border-slate-200/80 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus-ring dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-500"
                  {...register("name")}
                />
              </div>
              <ErrorMessage>{errors.name?.message}</ErrorMessage>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-email" className="text-sm font-medium text-slate-800 dark:text-slate-300">
                Email address
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="reg-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-200/80 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus-ring dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-500"
                  {...register("email")}
                />
              </div>
              <ErrorMessage>{errors.email?.message}</ErrorMessage>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-password" className="text-sm font-medium text-slate-800 dark:text-slate-300">
                Password <span className="text-slate-400 font-normal">(min 8 chars)</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="reg-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-200/80 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus-ring dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-500"
                  {...register("password")}
                />
              </div>
              <PasswordStrength password={password} />
              <ErrorMessage>{errors.password?.message}</ErrorMessage>
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-confirm" className="text-sm font-medium text-slate-800 dark:text-slate-300">
                Confirm password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="reg-confirm"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-200/80 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus-ring dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-500"
                  {...register("confirmPassword")}
                />
              </div>
              <ErrorMessage>{errors.confirmPassword?.message}</ErrorMessage>
            </div>

            <motion.button
              id="register-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="btn-primary mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold shadow-md shadow-cyan-500/20 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 cursor-pointer disabled:cursor-not-allowed"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {isSubmitting ? "Creating account…" : "Create account"}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-medium text-cyan-600 hover:text-cyan-700 hover:underline dark:text-cyan-400 dark:hover:text-cyan-300">
              Sign in
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
