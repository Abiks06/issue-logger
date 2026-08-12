"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/lib/validationSchemas";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { resendVerificationEmail } from "@/actions/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ErrorMessage from "@/components/ErrorMessage";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Bug, AlertCircle, Mail, Lock, Send } from "lucide-react";

type LoginForm = z.infer<typeof loginSchema>;

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const router = useRouter();
  const [error, setError] = useState("");
  const [showResendLink, setShowResendLink] = useState(false);
  const [lastEmail, setLastEmail] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [isResendPending, setIsResendPending] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      setError("");
      setShowResendLink(false);
      setResendMessage("");
      const email = data.email.trim().toLowerCase();
      setLastEmail(email);

      const result = await signIn("credentials", {
        email,
        password: data.password,
        redirect: false,
      });

      const errorText = result?.error?.toString() ?? "";
      if (errorText.includes("EMAIL_NOT_VERIFIED")) {
        setError("Please verify your email before signing in. Check your inbox for the verification link.");
        setShowResendLink(true);
        return;
      }

      if (result?.error) {
        setError("Invalid email or password. Please try again.");
        return;
      }

      toast.success("Welcome back!");
      router.push("/");
      router.refresh();
    });
  });

  const onResendVerification = async () => {
    if (!lastEmail) {
      setResendMessage("Enter your email and try logging in again first.");
      return;
    }
    setIsResendPending(true);
    setResendMessage("");

    try {
      await resendVerificationEmail(lastEmail);
      setResendMessage("Verification link resent. Check your inbox.");
    } catch (err) {
      console.error(err);
      setResendMessage("Unable to resend verification email. Please try again later.");
    } finally {
      setIsResendPending(false);
    }
  };

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
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Bug className="h-5 w-5" />
          </motion.span>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
              Sign in to Issue<span className="text-cyan-600 dark:text-cyan-400">Logger</span>
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
              Track and manage your issues in one place.
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

          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-email" className="text-sm font-medium text-slate-800 dark:text-slate-300">
                Email address
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="login-email"
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
              <label htmlFor="login-password" className="text-sm font-medium text-slate-800 dark:text-slate-300">
                Password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-200/80 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus-ring dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-500"
                  {...register("password")}
                />
              </div>
              <ErrorMessage>{errors.password?.message}</ErrorMessage>
            </div>

            <motion.button
              id="login-submit-btn"
              type="submit"
              disabled={isPending}
              className="btn-primary mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold shadow-md shadow-cyan-500/20 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {isPending ? "Signing in…" : "Sign in"}
            </motion.button>
          </form>

          <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600 dark:text-slate-400">
            <Link href="/auth/forgot-password" className="font-medium text-cyan-600 hover:text-cyan-700 hover:underline dark:text-cyan-400 dark:hover:text-cyan-300">
              Forgot password?
            </Link>
            {showResendLink ? (
              <button
                type="button"
                onClick={onResendVerification}
                disabled={isResendPending}
                className="flex items-center gap-1.5 text-left font-medium text-cyan-600 hover:underline dark:text-cyan-400 disabled:opacity-60 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                {isResendPending ? "Resending…" : "Resend verification email"}
              </button>
            ) : null}
            {resendMessage ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">{resendMessage}</p>
            ) : null}
            <p>
              Don&apos;t have an account?{" "}
              <Link href="/auth/register" className="font-medium text-cyan-600 hover:text-cyan-700 hover:underline dark:text-cyan-400 dark:hover:text-cyan-300">
                Create one
              </Link>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
