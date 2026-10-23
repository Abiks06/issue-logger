"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, Sparkles, X } from "lucide-react";
import { createSampleProject } from "@/actions/projects";
import { ONBOARDING_COOKIE } from "@/lib/constants";

export type OnboardingStep = { id: string; label: string; detail: string; href: string; done: boolean };

export function SampleProjectButton({ className = "btn-secondary" }: { className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await createSampleProject();
          if (!res.ok) return void toast.error(res.error);
          toast.success("Sample project ready");
          router.push(`/projects/${res.data.key}`);
        })
      }
    >
      <Sparkles className="h-4 w-4" /> {pending ? "Creating…" : "Try a sample project"}
    </button>
  );
}

/** Getting-started card on My work. Hides itself once every step is done, or when dismissed (cookie, so the server skips it). */
export function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  const router = useRouter();
  const done = steps.filter((s) => s.done).length;

  return (
    <section aria-labelledby="onboarding-heading" className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="onboarding-heading" className="text-sm font-semibold">Get set up</h2>
          <p className="mt-0.5 text-xs text-muted">{done} of {steps.length} done</p>
        </div>
        <button
          type="button"
          className="btn-icon h-7 w-7"
          aria-label="Hide getting started"
          onClick={() => {
            document.cookie = `${ONBOARDING_COOKIE}=1; path=/; max-age=31536000; samesite=lax`;
            router.refresh();
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ol className="mt-3 grid gap-2 sm:grid-cols-2">
        {steps.map((s) => (
          <li key={s.id}>
            <Link
              href={s.href}
              className={`flex items-start gap-2.5 rounded-md border border-line p-2.5 transition-colors hover:bg-surface-2/60 ${s.done ? "opacity-60" : ""}`}
            >
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${s.done ? "border-success bg-success text-white" : "border-line"}`}
              >
                {s.done && <Check className="h-3 w-3" />}
              </span>
              <span className="min-w-0">
                <span className={`block text-[13px] font-medium ${s.done ? "line-through" : ""}`}>{s.label}</span>
                <span className="block text-xs text-muted">{s.detail}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
