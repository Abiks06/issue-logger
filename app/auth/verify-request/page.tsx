import Link from "next/link";
import { FaEnvelopeOpenText } from "react-icons/fa";

export default function VerifyRequestPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      {/* Glow backdrop */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-linear-to-br from-cyan-400/20 to-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-linear-to-tl from-violet-400/10 to-fuchsia-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="card-shadow-lg rounded-2xl border border-slate-200/80 bg-[#fcfbf8] p-8 dark:border-slate-800 dark:bg-slate-900 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400">
            <FaEnvelopeOpenText className="text-3xl" />
          </div>
          
          <h1 className="mb-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Check your email
          </h1>
          
          <p className="mb-8 text-slate-600 dark:text-slate-400 leading-relaxed">
            We&apos;ve sent a verification link to your email address. Please click the link to verify your account before signing in.
          </p>

          <Link
            href="/auth/login"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
