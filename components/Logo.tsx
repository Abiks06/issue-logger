export function Logo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path d="M9 11.5h14M9 16h9M9 20.5h11" stroke="var(--accent-fg)" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="23" cy="20.5" r="2.6" fill="var(--accent-fg)" />
    </svg>
  );
}
