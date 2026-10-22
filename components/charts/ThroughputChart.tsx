"use client";

import { useState } from "react";
import type { DayPoint } from "@/lib/analytics";

const H = 160;
const PAD_TOP = 8;

function niceMax(v: number) {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / pow) * pow;
}

function dayLabel(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });
}

/**
 * Created vs resolved per day: paired thin bars on one y-axis, a per-day hover
 * column (bigger than the bars) with a tooltip listing both series, and a
 * table view for anyone who'd rather not hover.
 */
export default function ThroughputChart({ points }: { points: DayPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(1, ...points.flatMap((p) => [p.created, p.resolved])));
  const ticks = [0, max / 2, max];
  const totals = points.reduce((a, p) => ({ created: a.created + p.created, resolved: a.resolved + p.resolved }), { created: 0, resolved: 0 });
  const h = (v: number) => (v / max) * (H - PAD_TOP);
  const active = hover !== null ? points[hover] : null;

  return (
    <figure className="m-0">
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-series-1" /> Created <span className="font-semibold text-fg">{totals.created}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-series-2" /> Resolved <span className="font-semibold text-fg">{totals.resolved}</span>
        </span>
      </div>

      <div className="relative flex">
        <div className="relative mr-2 w-6 shrink-0 text-right text-[10px] text-faint" style={{ height: H }} aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: h(t) }}>{t}</span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1" style={{ height: H }} onPointerLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-line" style={{ bottom: h(t) }} aria-hidden />
          ))}
          <div className="absolute inset-0 flex" role="list" aria-label="Daily created and resolved issues">
            {points.map((p, i) => (
              <div
                key={p.date}
                role="listitem"
                tabIndex={0}
                aria-label={`${dayLabel(p.date)}: ${p.created} created, ${p.resolved} resolved`}
                className={`relative flex h-full flex-1 items-end justify-center gap-[2px] rounded-sm outline-none ${hover === i ? "bg-surface-2" : ""}`}
                onPointerEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              >
                {(["created", "resolved"] as const).map((k) => (
                  <span
                    key={k}
                    className={`w-full max-w-[6px] rounded-t-[4px] ${k === "created" ? "bg-series-1" : "bg-series-2"}`}
                    style={{ height: Math.max(p[k] > 0 ? 2 : 0, h(p[k])) }}
                  />
                ))}
              </div>
            ))}
          </div>

          {active && hover !== null && (
            <div
              className="pointer-events-none absolute -top-2 z-10 w-36 -translate-y-full rounded-md border border-line bg-surface px-2.5 py-2 text-xs shadow-[var(--shadow-lg)]"
              style={{ left: `clamp(0px, calc(${((hover + 0.5) / points.length) * 100}% - 72px), calc(100% - 144px))` }}
            >
              <p className="mb-1 text-faint">{dayLabel(active.date)}</p>
              <p className="flex items-center gap-2"><span className="h-0.5 w-3 bg-series-1" /><span className="font-semibold">{active.created}</span><span className="text-muted">created</span></p>
              <p className="flex items-center gap-2"><span className="h-0.5 w-3 bg-series-2" /><span className="font-semibold">{active.resolved}</span><span className="text-muted">resolved</span></p>
            </div>
          )}
        </div>
      </div>
      <div className="ml-8 mt-1.5 flex justify-between text-[10px] text-faint" aria-hidden>
        <span>{dayLabel(points[0].date)}</span>
        <span>{dayLabel(points[Math.floor(points.length / 2)].date)}</span>
        <span>{dayLabel(points[points.length - 1].date)}</span>
      </div>

      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-faint hover:text-muted">View as table</summary>
        <div className="mt-2 max-h-48 overflow-y-auto">
          <table className="w-full text-left">
            <thead className="text-faint"><tr><th className="py-1 font-medium">Day</th><th className="font-medium">Created</th><th className="font-medium">Resolved</th></tr></thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.date} className="border-t border-line"><td className="py-1">{dayLabel(p.date)}</td><td>{p.created}</td><td>{p.resolved}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
