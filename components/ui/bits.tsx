import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Small presentational pieces used across pages. Server-component safe.

const AVATAR_COLORS = ["#6366f1", "#ec4899", "#f97316", "#14b8a6", "#8b5cf6", "#0ea5e9", "#22c55e", "#ef4444"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

export function Avatar({ name, size = 20, className = "" }: { name: string | null | undefined; size?: number; className?: string }) {
  if (!name) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-line-strong ${className}`}
        style={{ width: size, height: size }}
        aria-label="Unassigned"
      />
    );
  }
  return (
    <span
      title={name}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.42), background: AVATAR_COLORS[hash(name) % AVATAR_COLORS.length] }}
    >
      {initials(name)}
    </span>
  );
}

export function LabelChip({ name, color }: { name: string; color: string }) {
  return (
    <span className="chip h-5 max-w-36 gap-1 rounded-full px-1.5 text-[11px]">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
      <span className="truncate">{name}</span>
    </span>
  );
}

export function ProjectBadge({ projectKey, color, size = 20 }: { projectKey: string; color: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md font-mono font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4, background: color }}
      aria-hidden
    >
      {projectKey.slice(0, 2)}
    </span>
  );
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface text-faint">{icon}</div>
      <p className="text-sm font-medium text-fg">{title}</p>
      {children && <div className="mt-1 max-w-sm text-[13px] text-muted">{children}</div>}
    </div>
  );
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "short" });

/** "3h ago", "yesterday", or a short date for anything older than a week. */
export function timeAgo(date: Date, now = new Date()) {
  const s = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(s);
  if (abs < 45) return "just now";
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
  if (abs < 7 * 86400) return rtf.format(Math.round(s / 86400), "day");
  return shortDate(date);
}

export function shortDate(date: Date) {
  return date.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    timeZone: "UTC",
  });
}

export function TimeAgo({ date }: { date: Date }) {
  return (
    <time dateTime={date.toISOString()} title={date.toLocaleString("en")} suppressHydrationWarning>
      {timeAgo(date)}
    </time>
  );
}
