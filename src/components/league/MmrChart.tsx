"use client";

import { useState } from "react";
import type { W3cTimelinePoint } from "@/lib/w3c";

const W = 600;
const H = 140;
const PAD = 6;

/** MMR over the ladder season as a small SVG line; hover a point for its value. */
export function MmrChart({ points }: { points: W3cTimelinePoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return null;

  const mmrs = points.map((p) => p.mmr);
  const min = Math.min(...mmrs);
  const max = Math.max(...mmrs);
  const span = Math.max(max - min, 40);
  const lo = min - (span - (max - min)) / 2;
  const t0 = new Date(points[0].date).getTime();
  const t1 = new Date(points[points.length - 1].date).getTime();
  const x = (d: string) => PAD + ((new Date(d).getTime() - t0) / Math.max(1, t1 - t0)) * (W - PAD * 2);
  const y = (m: number) => H - PAD - ((m - lo) / span) * (H - PAD * 2);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.mmr).toFixed(1)}`).join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  const delta = last.mmr - first.mmr;
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const shown = hover != null ? points[hover] : null;

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let dist = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(x(p.date) - px);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    setHover(best);
  }

  return (
    <div>
      <div className="flex items-baseline justify-between text-xs text-faint">
        {shown ? (
          <span>
            <span className="tnum font-bold text-fg">{shown.mmr}</span> on {fmt.format(new Date(shown.date))}
          </span>
        ) : (
          <span>
            <span className="tnum text-muted">{first.mmr}</span> on {fmt.format(new Date(first.date))}
          </span>
        )}
        <span>
          <span className="tnum font-bold text-fg">{last.mmr}</span>
          <span className={delta >= 0 ? "text-win" : "text-loss"}>
            {" "}
            {delta >= 0 ? "+" : ""}
            {delta}
          </span>{" "}
          on {fmt.format(new Date(last.date))}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 h-32 w-full cursor-crosshair"
        role="img"
        aria-label={`MMR from ${first.mmr} to ${last.mmr}`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="mmr-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--wg-gold)" stopOpacity="0.35" />
            <stop offset="1" stopColor="var(--wg-gold)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L${x(last.date).toFixed(1)},${H} L${x(first.date).toFixed(1)},${H} Z`} fill="url(#mmr-fill)" />
        <path d={path} fill="none" stroke="var(--wg-gold)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {shown ? (
          <>
            <line x1={x(shown.date)} x2={x(shown.date)} y1={0} y2={H} stroke="var(--wg-gold)" strokeOpacity="0.35" strokeDasharray="3 3" />
            <circle cx={x(shown.date)} cy={y(shown.mmr)} r="4.5" fill="var(--wg-bg)" stroke="var(--wg-gold)" strokeWidth="2" />
          </>
        ) : (
          <circle cx={x(last.date)} cy={y(last.mmr)} r="3.5" fill="var(--wg-gold)" />
        )}
      </svg>
    </div>
  );
}
