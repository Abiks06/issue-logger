"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

/** Shown when a page throws. The digest lets an error be matched to server logs. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <Logo className="h-8 w-8 opacity-60" />
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-[13px] text-muted">
        The page hit an unexpected error. Try again; if it keeps happening, the reference below helps us find it.
      </p>
      {error.digest && <code className="rounded bg-surface-2 px-2 py-1 font-mono text-xs text-faint">ref {error.digest}</code>}
      <div className="mt-2 flex gap-2">
        <button className="btn-primary" onClick={reset}>Try again</button>
        <Link href="/" className="btn-secondary">Back to my work</Link>
      </div>
    </div>
  );
}
