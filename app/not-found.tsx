import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <Logo className="h-8 w-8 opacity-60" />
      <h1 className="text-lg font-semibold">Not found</h1>
      <p className="max-w-sm text-[13px] text-muted">This page doesn&apos;t exist, or you don&apos;t have access to it.</p>
      <Link href="/" className="btn-secondary mt-2">Back to my work</Link>
    </div>
  );
}
