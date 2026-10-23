import { CircleCheck, Hourglass, Timer, TimerOff } from "lucide-react";
import { describeClock, type Clock, type ClockState, type SlaStatus } from "@/lib/sla";

// SLA state always pairs an icon with text, so it never relies on colour alone.

const STYLE: Record<ClockState, { icon: typeof Timer; className: string; label: string }> = {
  on_track: { icon: Timer, className: "text-muted", label: "On track" },
  at_risk: { icon: Hourglass, className: "text-amber-600 dark:text-amber-400", label: "At risk" },
  breached: { icon: TimerOff, className: "text-danger", label: "Breached" },
  met: { icon: CircleCheck, className: "text-success", label: "Met" },
};

/** The clock that matters most right now: an unanswered response first, then resolution. */
export function headlineClock(sla: SlaStatus): { clock: Clock; kind: "Response" | "Resolution" } | null {
  if (sla.respond && !sla.respond.stoppedAt) return { clock: sla.respond, kind: "Response" };
  if (sla.resolve) return { clock: sla.resolve, kind: "Resolution" };
  if (sla.respond) return { clock: sla.respond, kind: "Response" };
  return null;
}

/** Compact badge for cards and rows; hidden unless the issue is at risk or breached. */
export function SlaBadge({ sla }: { sla: SlaStatus }) {
  const head = headlineClock(sla);
  if (!head || (head.clock.state !== "at_risk" && head.clock.state !== "breached")) return null;
  const { icon: Icon, className, label } = STYLE[head.clock.state];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 text-[11px] font-medium ${className}`}
      title={`${head.kind} SLA ${label.toLowerCase()}: ${describeClock(head.clock)}`}
      suppressHydrationWarning
    >
      <Icon className="h-3 w-3" aria-hidden />
      {describeClock(head.clock)}
    </span>
  );
}

/** Full row for the issue sidebar: state, time left or result, and the due time. */
export function SlaClockRow({ label, clock }: { label: string; clock: Clock | null }) {
  if (!clock) return null;
  const { icon: Icon, className, label: stateLabel } = STYLE[clock.state];
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-faint">{label}</span>
      <span
        className={`inline-flex items-center gap-1 font-medium ${className}`}
        title={`Due ${clock.dueAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}`}
        suppressHydrationWarning
      >
        <Icon className="h-3 w-3" aria-hidden />
        {stateLabel} · {describeClock(clock)}
      </span>
    </div>
  );
}
