import Link from "next/link";

// Count matrix with sequential single-hue shading. Every cell prints its value,
// so colour only reinforces what the numbers already say; each cell links to
// the matching filtered list.

type Axis = { key: string; label: React.ReactNode };

export default function Heatmap({
  rows,
  columns,
  value,
  href,
  caption,
}: {
  rows: Axis[];
  columns: Axis[];
  value: (row: string, column: string) => number;
  href: (row: string, column: string) => string;
  caption: string;
}) {
  const max = Math.max(1, ...rows.flatMap((r) => columns.map((c) => value(r.key, c.key))));
  const rowTotal = (r: string) => columns.reduce((s, c) => s + value(r, c.key), 0);
  const colTotal = (c: string) => rows.reduce((s, r) => s + value(r.key, c), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] table-fixed border-separate border-spacing-1 text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th className="w-28" />
            {columns.map((c) => (
              <th key={c.key} scope="col" className="pb-1 text-center font-medium text-faint">{c.label}</th>
            ))}
            <th scope="col" className="w-12 pb-1 text-right font-medium text-faint">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th scope="row" className="pr-2 text-left font-normal text-muted">{r.label}</th>
              {columns.map((c) => {
                const v = value(r.key, c.key);
                // 12%–85% of the series colour over the surface: light = few, dark = many.
                const pct = v === 0 ? 0 : Math.round(12 + (v / max) * 73);
                return (
                  <td key={c.key} className="p-0">
                    <Link
                      href={href(r.key, c.key)}
                      className="flex h-9 items-center justify-center rounded-md font-medium tabular-nums transition-[filter] hover:brightness-110"
                      style={{
                        background: v === 0 ? "var(--surface-2)" : `color-mix(in oklab, var(--series-1) ${pct}%, var(--surface))`,
                        color: v === 0 ? "var(--text-faint)" : pct > 55 ? "white" : "var(--text)",
                      }}
                      aria-label={`${v} issues`}
                    >
                      {v}
                    </Link>
                  </td>
                );
              })}
              <td className="pl-2 text-right font-medium tabular-nums">{rowTotal(r.key)}</td>
            </tr>
          ))}
          <tr>
            <th scope="row" className="pr-2 pt-1 text-left font-medium text-faint">Total</th>
            {columns.map((c) => (
              <td key={c.key} className="pt-1 text-center font-medium tabular-nums">{colTotal(c.key)}</td>
            ))}
            <td />
          </tr>
        </tbody>
      </table>
      <div className="mt-2 flex items-center justify-end gap-2 text-[10px] text-faint" aria-hidden>
        Fewer
        <span className="h-2 w-24 rounded-full" style={{ background: "linear-gradient(to right, color-mix(in oklab, var(--series-1) 12%, var(--surface)), color-mix(in oklab, var(--series-1) 85%, var(--surface)))" }} />
        More
      </div>
    </div>
  );
}
