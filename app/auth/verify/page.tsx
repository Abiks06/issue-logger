"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { verifyEmail } from "@/actions/auth";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState("Verifying your email…");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    async function verify() {
      const token = searchParams.get("token");
      if (!token) {
        setMessage("Verification token is missing. Use the link in your email.");
        setIsSuccess(false);
        return;
      }

      const result = await verifyEmail(token);
      setMessage(result.message || "");
      setIsSuccess(result.success);
      if (result.success) {
        setTimeout(() => router.push("/auth/login"), 1500);
      }
    }

    verify();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-[#fcfbf8] p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
          Email verification
        </h1>
        <p className={`mt-3 text-sm ${isSuccess ? "text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-slate-400"}`}>
          {message}
        </p>
        <p className="mt-6 text-center text-sm text-slate-700 dark:text-slate-400">
          <Link href="/auth/login" className="font-medium text-cyan-700 hover:underline dark:text-cyan-400">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-600 dark:border-slate-700 dark:border-t-cyan-500" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
