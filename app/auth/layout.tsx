import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-full flex-col items-center justify-center px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,var(--accent-soft),transparent_70%)]"
      />
      <Link href="/" className="relative mb-8 flex items-center gap-2 text-[15px] font-semibold">
        <Logo className="h-7 w-7" />
        Issue Logger
      </Link>
      <div className="card animate-fade-up relative w-full max-w-[400px] p-6 sm:p-8">{children}</div>
    </div>
  );
}
