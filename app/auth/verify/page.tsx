"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { verifyEmail } from "@/actions/auth";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState("Verifying your email…");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function verify() {
      const token = searchParams.get("token");
      if (!token) {
        setMessage("Verification token is missing. Use the link in your email.");
        setIsSuccess(false);
        setIsLoading(false);
        return;
      }

      const result = await verifyEmail(token);
      setMessage(result.message || "");
      setIsSuccess(result.success);
      setIsLoading(false);
      if (result.success) {
        setTimeout(() => router.push("/auth/login"), 1500);
      }
    }

    verify();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center px-3 py-6 sm:px-4 sm:py-12">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-gradient-to-br from-cyan-400/15 to-blue-500/8 blur-3xl" />
      </div>

      <motion.div
        className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const }}
      >
        <div className="glass-card rounded-2xl p-6 sm:p-8 text-center">
          {/* Status icon */}
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl">
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="h-8 w-8 text-cyan-500" />
              </motion.div>
            ) : isSuccess ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30"
              >
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/30"
              >
                <AlertCircle className="h-8 w-8 text-rose-500" />
              </motion.div>
            )}
          </div>

          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
            Email verification
          </h1>
          <p className={`mt-3 text-sm ${isSuccess ? "text-emerald-600 dark:text-emerald-400" : isLoading ? "text-slate-500 dark:text-slate-400" : "text-rose-600 dark:text-rose-400"}`}>
            {message}
          </p>
          <p className="mt-6 text-sm">
            <Link href="/auth/login" className="inline-flex items-center gap-1 font-medium text-cyan-600 hover:text-cyan-700 hover:underline dark:text-cyan-400 dark:hover:text-cyan-300">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-cyan-500 dark:border-slate-700 dark:border-t-cyan-400" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
