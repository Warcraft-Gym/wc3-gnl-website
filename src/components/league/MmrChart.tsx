"use client";

import { useEffect, useRef, useState } from "react";
import type { W3cTimelinePoint } from "@/lib/w3c";
import { signed } from "@/lib/figures.mjs";
import { RACES, cn, type Race } from "@/lib/utils";

/** One ladder race on the chart: its season MMR and its run of points. */
export type MmrLine = { race: Race; mmr: number; points: W3cTimelinePoint[] };

const H = 220;
const PAD = { top: 12, right: 44, bottom: 22, left: 40 };
// UTC, so the server and the browser name the same day.
const DATE_FMT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** Tick step that keeps the axis readable over a wide range. */
function tickStep(span: number) {
  return span > 500 ? 200 : 100;
}

function ticksFor(lo: number, hi: number) {
  const step = tickStep(hi - lo);
  const out: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) out.push(t);
  return out;
}

/**
 * MMR over the ladder season, one line per race on one axis. The selected race
 * draws in gold; the others stay quiet and carry their race icon as a label.
 */
export function MmrChart({ lines, main }: { lines: MmrLine[]; main: Race }) {
  const order = [...lines].sort((a, b) => (a.race === main ? -1 : b.race === main ? 1 : b.mmr - a.mmr));
  const [selected, setSelected] = useState<Race>(main);
  const [at, setAt] = useState<number | null>(null);
  const [width, setWidth] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  // Real pixel width, so the tick labels keep their size on a wide card.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const drawn = order.filter((l) => l.points.length >= 2);
  if (!drawn.length) return null;

  const all = drawn.flatMap((l) => l.points);
  const mmrs = all.map((p) => p.mmr);
  const step = tickStep(Math.max(...mmrs) - Math.min(...mmrs));
  const lo = Math.floor(Math.min(...mmrs) / step) * step;
  const hi = Math.ceil(Math.max(...mmrs) / step) * step;
  const times = all.map((p) => new Date(p.date).getTime());
  const scale = { t0: Math.min(...times), t1: Math.max(...times), lo, hi: hi > lo ? hi : lo + step };

  const inner = { w: Math.max(120, width - PAD.left - PAD.right), h: H - PAD.top - PAD.bottom };
  const x = (date: string) =>
    PAD.left + ((new Date(date).getTime() - scale.t0) / Math.max(1, scale.t1 - scale.t0)) * inner.w;
  const y = (mmr: number) => PAD.top + (1 - (mmr - scale.lo) / (scale.hi - scale.lo)) * inner.h;
  const path = (pts: W3cTimelinePoint[]) =>
    pts.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.mmr).toFixed(1)}`).join(" ");

  const active = drawn.find((l) => l.race === selected) ?? drawn[0];
  const shown = at != null ? active.points[Math.min(at, active.points.length - 1)] : null;
  const first = active.points[0];
  const last = active.points[active.points.length - 1];
  const point = shown ?? last;
  const delta = point.mmr - first.mmr;
  const dots = inner.w / Math.max(1, active.points.length - 1) >= 10;
  const quiet = drawn.filter((l) => l.race !== active.race);
  // Two runs that end on the same day stack their icons, so push them apart.
  const endLabels = quiet
    .map((l) => {
      const end = l.points[l.points.length - 1];
      return { race: l.race, x: x(end.date), y: y(end.mmr) };
    })
    .sort((a, b) => a.y - b.y);
  endLabels.forEach((l, i) => {
    const above = endLabels[i - 1];
    if (above && Math.abs(l.x - above.x) < 20 && l.y < above.y + 18) l.y = above.y + 18;
  });

  function walk(e: React.KeyboardEvent) {
    const n = active.points.length;
    const here = at ?? n - 1;
    if (e.key === "ArrowRight") setAt(Math.min(n - 1, here + 1));
    else if (e.key === "ArrowLeft") setAt(Math.max(0, here - 1));
    else if (e.key === "Home") setAt(0);
    else if (e.key === "End") setAt(n - 1);
    else if (e.key === "Escape") setAt(null);
    else return;
    e.preventDefault();
  }

  function track(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = 0;
    active.points.forEach((p, i) => {
      if (Math.abs(x(p.date) - px) < Math.abs(x(active.points[best].date) - px)) best = i;
    });
    setAt(best);
  }

  return (
    <div ref={box}>
      {/* Race buttons, the main race first. A race with one point has a button
          and no line. */}
      <div className="flex flex-wrap gap-1.5">
        {order.map((l) => {
          const on = l.race === active.race;
          const flat = l.points.length < 2;
          return (
            <button
              key={l.race}
              type="button"
              disabled={flat}
              onClick={() => {
                setSelected(l.race);
                setAt(null);
              }}
              aria-pressed={on}
              title={flat ? `${RACES[l.race].label} has too few games to draw` : `Show ${RACES[l.race].label}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs transition-colors motion-reduce:transition-none",
                on ? "border-gold/60 bg-gold/10 text-gold" : "border-line text-muted hover:border-gold/40 hover:text-fg",
                flat && "opacity-40",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/factions/${l.race}.png`} alt="" width={16} height={16} className="shrink-0" />
              {RACES[l.race].label}
              <span className="tnum font-mono">{l.mmr}</span>
            </button>
          );
        })}
      </div>

      <p aria-live="polite" className="mt-3 flex flex-wrap items-baseline gap-x-2 text-xs text-muted">
        <span className="text-fg">{RACES[active.race].label}</span>
        <span className="tnum font-bold text-gold">{point.mmr}</span>
        <span>on {DATE_FMT.format(new Date(point.date))}</span>
        <span className="tnum">
          {signed(delta)} since {DATE_FMT.format(new Date(first.date))}
        </span>
      </p>

      {/* The plot waits for its real pixel width, so no frame is drawn with a
          stretched scale. */}
      {width === 0 ? null : (
      <svg
        width={width}
        height={H}
        tabIndex={0}
        role="img"
        aria-label={`MMR over the ladder season, ${drawn.length} race${drawn.length > 1 ? "s" : ""}. ${RACES[active.race].label} runs from ${first.mmr} to ${last.mmr}. Arrow keys walk the points.`}
        onKeyDown={walk}
        onPointerMove={track}
        onPointerDown={track}
        onPointerLeave={() => setAt(null)}
        onBlur={() => setAt(null)}
        className="mt-2 block touch-pan-y"
      >
        <defs>
          <linearGradient id="mmr-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--wg-gold)" stopOpacity="0.3" />
            <stop offset="1" stopColor="var(--wg-gold)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Scale, so a value reads with no hover */}
        {ticksFor(scale.lo, scale.hi).map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--wg-line)" strokeWidth="1" />
            <text x={PAD.left - 6} y={y(t) + 3.5} textAnchor="end" className="tnum fill-faint text-[10px]">
              {t}
            </text>
          </g>
        ))}
        <text x={PAD.left} y={H - 6} className="fill-faint text-[10px]">
          {DATE_FMT.format(new Date(scale.t0))}
        </text>
        <text x={width - PAD.right} y={H - 6} textAnchor="end" className="fill-faint text-[10px]">
          {DATE_FMT.format(new Date(scale.t1))}
        </text>

        {/* The quiet races, each labelled by its own icon */}
        {quiet.map((l) => (
          <path key={l.race} d={path(l.points)} fill="none" stroke="var(--wg-text-faint)" strokeWidth="1.5" strokeOpacity="0.55" strokeLinejoin="round" />
        ))}
        {endLabels.map((l) => (
          <image key={l.race} href={`/factions/${l.race}.png`} x={l.x + 5} y={l.y - 8} width="16" height="16" opacity="0.8">
            <title>{RACES[l.race].label}</title>
          </image>
        ))}

        {/* The selected race */}
        <path
          d={`${path(active.points)} L${x(last.date).toFixed(1)},${PAD.top + inner.h} L${x(first.date).toFixed(1)},${PAD.top + inner.h} Z`}
          fill="url(#mmr-fill)"
        />
        <path d={path(active.points)} fill="none" stroke="var(--wg-gold)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* Dots only while they stand apart; a dense run keeps the end dot. */}
        {(dots ? active.points : [last]).map((p) => (
          <circle key={p.date} cx={x(p.date)} cy={y(p.mmr)} r="2.5" fill="var(--wg-gold)" stroke="var(--wg-bg)" strokeWidth="2" />
        ))}
        <text x={x(last.date) + 6} y={y(last.mmr) + 3.5} className="tnum fill-gold text-[11px] font-bold">
          {last.mmr}
        </text>
        {shown ? (
          <>
            <line x1={x(shown.date)} x2={x(shown.date)} y1={PAD.top} y2={PAD.top + inner.h} stroke="var(--wg-gold)" strokeOpacity="0.4" strokeDasharray="3 3" />
            <circle cx={x(shown.date)} cy={y(shown.mmr)} r="4.5" fill="var(--wg-bg)" stroke="var(--wg-gold)" strokeWidth="2" />
          </>
        ) : null}
      </svg>
      )}
      {width === 0 ? <div style={{ height: H }} /> : null}
    </div>
  );
}
