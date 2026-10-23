"use client";

import { useState } from "react";
import type { WeekPoint } from "@/lib/velocity";

const H = 160;
const PAD_TOP = 14;

function niceMax(v: number) {
  if (v <= 5) return 5;
  const pow = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / pow) * pow;
}

function weekLabel(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });
}

/**
 * Points completed per week, one series on one axis, with the rolling
 * average as a dashed reference line labelled directly. The in-progress week
 * is drawn lighter so it doesn't read as a drop. Per-week hover tooltip plus
 * a table view.
 */
export default function VelocityChart({ weeks, average }: { weeks: WeekPoint[]; average: number | null }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(1, average ?? 0, ...weeks.map((w) => w.points)));
  const h = (v: number) => (v / max) * (H - PAD_TOP);
  const ticks = [0, max / 2, max];
  const active = hover !== null ? weeks[hover] : null;

  return (
    <figure className="m-0">
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
          {average !== null && (
            <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-dashed border-fg/50" style={{ bottom: h(average) }} aria-hidden>
              <span className="absolute -top-4 right-0 rounded bg-surface px-1 text-[10px] font-medium text-muted">
                4-wk avg {average.toFixed(1)}
              </span>
            </div>
          )}
          <div className="absolute inset-0 flex" role="list" aria-label="Points completed per week">
            {weeks.map((w, i) => (
              <div
                key={w.weekStart}
                role="listitem"
                tabIndex={0}
                aria-label={`Week of ${weekLabel(w.weekStart)}: ${w.points} points, ${w.issues} issues${w.partial ? " (in progress)" : ""}`}
                className={`relative flex h-full flex-1 items-end justify-center rounded-sm outline-none ${hover === i ? "bg-surface-2" : ""}`}
                onPointerEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              >
                <span
                  className={`w-full max-w-[22px] rounded-t-[4px] ${w.partial ? "bg-series-1/45" : "bg-series-1"}`}
                  style={{ height: Math.max(w.points > 0 ? 2 : 0, h(w.points)) }}
                />
              </div>
            ))}
          </div>

          {active && hover !== null && (
            <div
              className="pointer-events-none absolute -top-2 z-20 w-40 -translate-y-full rounded-md border border-line bg-surface px-2.5 py-2 text-xs shadow-[var(--shadow-lg)]"
              style={{ left: `clamp(0px, calc(${((hover + 0.5) / weeks.length) * 100}% - 80px), calc(100% - 160px))` }}
            >
              <p className="mb-1 text-faint">Week of {weekLabel(active.weekStart)}{active.partial ? " (so far)" : ""}</p>
              <p><span className="font-semibold">{active.points}</span> <span className="text-muted">points</span></p>
              <p><span className="font-semibold">{active.issues}</span> <span className="text-muted">issues done{active.unestimated ? `, ${active.unestimated} unestimated` : ""}</span></p>
            </div>
          )}
        </div>
      </div>
      <div className="ml-8 mt-1.5 flex justify-between text-[10px] text-faint" aria-hidden>
        <span>{weekLabel(weeks[0].weekStart)}</span>
        <span>This week</span>
      </div>

      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-faint hover:text-muted">View as table</summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-faint">
            <tr><th className="py-1 font-medium">Week of</th><th className="font-medium">Points</th><th className="font-medium">Issues</th><th className="font-medium">Unestimated</th></tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.weekStart} className="border-t border-line">
                <td className="py-1">{weekLabel(w.weekStart)}{w.partial ? " (so far)" : ""}</td><td>{w.points}</td><td>{w.issues}</td><td>{w.unestimated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
