// Ranked horizontal bars with direct labels: every value is printed, so the
// chart needs no tooltip and colour never carries meaning on its own.

export type BarItem = { key: string; label: React.ReactNode; value: number; color?: string; icon?: React.ReactNode };

export default function BarList({ items, emptyText = "Nothing to show yet." }: { items: BarItem[]; emptyText?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.every((i) => i.value === 0)) return <p className="py-6 text-center text-xs text-faint">{emptyText}</p>;

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-3 text-[13px]">
          <span className="flex w-28 shrink-0 items-center gap-2 truncate text-muted sm:w-36">
            {item.icon}
            <span className="truncate">{item.label}</span>
          </span>
          <span className="relative h-2 flex-1 rounded-full bg-surface-2" aria-hidden>
            <span
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${(item.value / max) * 100}%`, minWidth: item.value > 0 ? 4 : 0, background: item.color ?? "var(--series-1)" }}
            />
          </span>
          <span className="w-8 text-right font-medium tabular-nums">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}
