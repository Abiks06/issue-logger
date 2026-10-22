import { Bug, Flame, ListChecks, Sparkles } from "lucide-react";
import { PRIORITY_META, STATUS_META, TYPE_META, type IssueKind, type Priority, type Status } from "@/lib/constants";

// Status and priority glyphs drawn as SVG so they read at 14px and carry
// progress information (the status ring fills as work advances).

const STATUS_FILL: Record<Status, number> = {
  BACKLOG: 0,
  TODO: 0,
  IN_PROGRESS: 0.5,
  IN_REVIEW: 0.75,
  DONE: 1,
  CANCELED: 1,
};

export function StatusIcon({ status, className = "h-3.5 w-3.5" }: { status: Status; className?: string }) {
  const { color, label } = STATUS_META[status];
  const fill = STATUS_FILL[status];
  const r = 3.2;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 14 14" className={`shrink-0 ${className}`} role="img" aria-label={label}>
      <circle
        cx="7" cy="7" r="6" fill="none" stroke={color} strokeWidth="1.5"
        strokeDasharray={status === "BACKLOG" ? "1.6 1.6" : undefined}
      />
      {status === "DONE" && (
        <>
          <circle cx="7" cy="7" r="6" fill={color} />
          <path d="M4.3 7.2l1.8 1.8 3.6-3.8" fill="none" stroke="var(--surface)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {status === "CANCELED" && (
        <>
          <circle cx="7" cy="7" r="6" fill={color} />
          <path d="M5 5l4 4M9 5l-4 4" stroke="var(--surface)" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
      {fill > 0 && fill < 1 && (
        <circle
          cx="7" cy="7" r={r} fill="none" stroke={color} strokeWidth={r * 2}
          strokeDasharray={`${c * fill} ${c}`} transform="rotate(-90 7 7)"
        />
      )}
    </svg>
  );
}

export function PriorityIcon({ priority, className = "h-3.5 w-3.5" }: { priority: Priority; className?: string }) {
  const { color, label } = PRIORITY_META[priority];
  if (priority === "URGENT") {
    return (
      <svg viewBox="0 0 14 14" className={`shrink-0 ${className}`} role="img" aria-label={label}>
        <rect x="1" y="1" width="12" height="12" rx="3" fill={color} />
        <path d="M7 3.8v4M7 10.2v.01" stroke="white" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (priority === "NONE") {
    return (
      <svg viewBox="0 0 14 14" className={`shrink-0 ${className}`} role="img" aria-label={label}>
        {[2, 6, 10].map((x) => <rect key={x} x={x} y="6.25" width="2" height="1.5" rx=".5" fill="var(--text-faint)" />)}
      </svg>
    );
  }
  const bars = PRIORITY_META[priority].rank; // LOW=1, MEDIUM=2, HIGH=3
  return (
    <svg viewBox="0 0 14 14" className={`shrink-0 ${className}`} role="img" aria-label={label}>
      {[0, 1, 2].map((i) => (
        <rect
          key={i} x={1.5 + i * 4} y={9 - i * 3} width="3" height={3.5 + i * 3} rx=".8"
          fill={i < bars ? "var(--text-muted)" : "var(--surface-3)"}
        />
      ))}
    </svg>
  );
}

const TYPE_ICONS = { BUG: Bug, FEATURE: Sparkles, TASK: ListChecks, INCIDENT: Flame } as const;

export function TypeIcon({ type, className = "h-3.5 w-3.5" }: { type: IssueKind; className?: string }) {
  const Icon = TYPE_ICONS[type];
  return <Icon className={`shrink-0 ${className}`} style={{ color: TYPE_META[type].color }} aria-label={TYPE_META[type].label} />;
}
