"use client";

import { useEffect, useRef, useState } from "react";
import type { W3cTimelinePoint } from "@/lib/w3c";
import { RaceIcon } from "@/components/ui/RaceIcon";
import { record, signed } from "@/lib/figures.mjs";
import { RACES, cn, type Race } from "@/lib/utils";

/** One ladder race: where it stands this season and its run of MMR points. */
export type MmrLine = {
  race: Race;
  mmr: number;
  league: string;
  division: number;
  rank: number;
  wins: number;
  losses: number;
  points: W3cTimelinePoint[];
};

const PAD = { top: 16, right: 66, bottom: 26, left: 44 };
/** Room for one gutter label, so two never sit on top of each other. */
const LABEL_GAP = 16;
// UTC, so the server and the browser name the same day.
const DATE_FMT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const DASH = "—";

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

/** The MMR of one race on a date: its latest point on or before that date. */
function mmrAt(points: W3cTimelinePoint[], time: number): number | null {
  let hit: number | null = null;
  for (const p of points) {
    if (Date.parse(p.date) > time) break;
    hit = p.mmr;
  }
  return hit;
}

/**
 * The W3Champions ladder band: the race rows on the left select the line on
 * the right. One MMR axis for every race, the selected race in gold, the
 * others quiet with their icon and end value in the right gutter.
 */
export function MmrChart({ lines, main }: { lines: MmrLine[]; main: Race }) {
  const order = [...lines].sort((a, b) => (a.race === main ? -1 : b.race === main ? 1 : b.mmr - a.mmr));
  const drawn = order.filter((l) => l.points.length >= 2);
  const [selected, setSelected] = useState<Race>(main);
  const [hovered, setHovered] = useState<Race | null>(null);
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

  const active = drawn.find((l) => l.race === selected) ?? drawn[0];
  const dates = [...new Set(drawn.flatMap((l) => l.points.map((p) => Date.parse(p.date))))].sort((a, b) => a - b);
  const readAt = active ? dates[Math.min(at ?? dates.length - 1, dates.length - 1)] : 0;

  function rows() {
    return (
      <ul className="panel divide-y divide-line/60">
        {order.map((l) => {
          const drawable = l.points.length >= 2;
          const on = drawable && active?.race === l.race;
          return (
            <li key={l.race}>
              <button
                type="button"
                disabled={!drawable}
                aria-pressed={on}
                onClick={() => setSelected(l.race)}
                onPointerEnter={() => setHovered(l.race)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(l.race)}
                onBlur={() => setHovered(null)}
                className={cn(
                  "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-l-2 px-4 py-3 text-left transition-colors motion-reduce:transition-none",
                  on ? "border-gold bg-gold/10" : "border-transparent",
                  drawable && !on && "hover:bg-surface-2",
                  drawable && !on && hovered === l.race && "bg-surface-2",
                  !drawable && "cursor-default",
                )}
              >
                <RaceIcon race={l.race} size={26} className={cn(!drawable && "opacity-60")} />
                <span className="min-w-0">
                  <span className={cn("block truncate font-display text-sm font-bold uppercase", on ? "text-gold" : "text-fg")}>
                    {RACES[l.race].label}
                  </span>
                  {l.league ? (
                    <span className="block truncate text-xs text-muted">
                      {l.league}
                      {l.division ? ` ${l.division}` : ""}
                      {l.rank ? <span className="text-faint"> · rank {l.rank}</span> : null}
                    </span>
                  ) : null}
                  <span className="tnum block truncate text-xs text-muted">Ladder games {record(l.wins, l.losses) ?? DASH}</span>
                  {/* Only worth saying while the chart is there to compare with. */}
                  {drawable || !drawn.length ? null : <span className="block text-xs text-faint">Too few games for a line</span>}
                </span>
                <span className="tnum font-display text-lg font-bold text-gold">{l.mmr}</span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  if (!active) return rows();

  const H = width < 520 ? 260 : 320;
  const all = drawn.flatMap((l) => l.points);
  const mmrs = all.map((p) => p.mmr);
  const step = tickStep(Math.max(...mmrs) - Math.min(...mmrs));
  const lo = Math.floor(Math.min(...mmrs) / step) * step;
  const hiRaw = Math.ceil(Math.max(...mmrs) / step) * step;
  const scale = { t0: dates[0], t1: dates[dates.length - 1], lo, hi: hiRaw > lo ? hiRaw : lo + step };

  const inner = { w: Math.max(120, width - PAD.left - PAD.right), h: H - PAD.top - PAD.bottom };
  const x = (date: string | number) =>
    PAD.left + ((typeof date === "number" ? date : Date.parse(date)) - scale.t0) / Math.max(1, scale.t1 - scale.t0) * inner.w;
  const y = (mmr: number) => PAD.top + (1 - (mmr - scale.lo) / (scale.hi - scale.lo)) * inner.h;
  const path = (pts: W3cTimelinePoint[]) =>
    pts.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.mmr).toFixed(1)}`).join(" ");

  const first = active.points[0];
  const last = active.points[active.points.length - 1];
  const activeMmr = mmrAt(active.points, readAt) ?? first.mmr;
  const others = drawn
    .filter((l) => l.race !== active.race)
    .map((l) => ({ race: l.race, mmr: mmrAt(l.points, readAt) }))
    .filter((o): o is { race: Race; mmr: number } => o.mmr != null)
    .sort((a, b) => b.mmr - a.mmr);
  const quiet = drawn.filter((l) => l.race !== active.race);

  // Every line carries its icon and end value in the right gutter, pushed
  // apart and held inside the plot box, so no icon lands on the lines.
  const gutterX = width - PAD.right + 6;
  const top = PAD.top + 8;
  const floor = PAD.top + inner.h - 8;
  const labels = drawn
    .map((l) => {
      const end = l.points[l.points.length - 1];
      return { race: l.race, mmr: end.mmr, endX: x(end.date), endY: y(end.mmr), y: y(end.mmr) };
    })
    .sort((a, b) => a.y - b.y);
  labels.forEach((l, i) => {
    const above = labels[i - 1];
    l.y = Math.max(l.y, top, above ? above.y + LABEL_GAP : top);
  });
  for (let i = labels.length - 1; i >= 0; i--) {
    labels[i].y = Math.min(labels[i].y, floor);
    if (i) labels[i - 1].y = Math.min(labels[i - 1].y, labels[i].y - LABEL_GAP);
  }

  function walk(e: React.KeyboardEvent) {
    const here = at ?? dates.length - 1;
    const i = drawn.findIndex((l) => l.race === active.race);
    if (e.key === "ArrowRight") setAt(Math.min(dates.length - 1, here + 1));
    else if (e.key === "ArrowLeft") setAt(Math.max(0, here - 1));
    else if (e.key === "Home") setAt(0);
    else if (e.key === "End") setAt(dates.length - 1);
    else if (e.key === "ArrowDown") setSelected(drawn[(i + 1) % drawn.length].race);
    else if (e.key === "ArrowUp") setSelected(drawn[(i - 1 + drawn.length) % drawn.length].race);
    else if (e.key === "Escape") setAt(null);
    else return;
    e.preventDefault();
  }

  function track(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = 0;
    dates.forEach((d, i) => {
      if (Math.abs(x(d) - px) < Math.abs(x(dates[best]) - px)) best = i;
    });
    setAt(best);
  }

  return (
    <div className="grid gap-4 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      {rows()}
      <div ref={box} className="panel min-h-[260px] p-4 min-[900px]:min-h-[320px]">
        {/* A fixed row above the plot, so the readout never covers the
            crosshair and never leaves the card at any width. */}
        <p aria-live="polite" className="flex min-h-[3.25rem] flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted sm:min-h-[1.75rem]">
          <span className="font-mono uppercase tracking-[0.14em] text-faint">{DATE_FMT.format(new Date(readAt))}</span>
          <span className="inline-flex items-center gap-1.5 font-bold text-gold">
            <RaceIcon race={active.race} size={16} />
            <span className="tnum">{activeMmr}</span>
            <span className="tnum font-normal text-muted">{signed(activeMmr - first.mmr)}</span>
          </span>
          {others.map((o) => (
            <span key={o.race} className="inline-flex items-center gap-1.5">
              <RaceIcon race={o.race} size={14} className="opacity-70" />
              <span className="tnum">{o.mmr}</span>
            </span>
          ))}
        </p>

        {/* The plot waits for its real pixel width, so no frame is drawn with
            a stretched scale. */}
        {width === 0 ? null : (
          <svg
            width={width}
            height={H}
            tabIndex={0}
            role="img"
            aria-label={`MMR over the ladder season, ${drawn.map((l) => RACES[l.race].label).join(", ")}, from ${scale.lo} to ${scale.hi}. ${RACES[active.race].label} is selected and runs from ${first.mmr} to ${last.mmr}. Left and right walk the dates, up and down change the race.`}
            onKeyDown={walk}
            onPointerMove={track}
            onPointerDown={track}
            onPointerLeave={() => setAt(null)}
            onBlur={() => setAt(null)}
            // The ring marks a keyboard stop, so a pointer click leaves no ring.
            className="mt-1 block touch-pan-y [outline:none] focus-visible:[outline:2px_solid_var(--wg-gold)] focus-visible:[outline-offset:2px]"
          >
            <defs>
              <linearGradient id="mmr-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--wg-gold)" stopOpacity="0.3" />
                <stop offset="1" stopColor="var(--wg-gold)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Catches the pointer over the whole plot, for the crosshair. */}
            <rect x={PAD.left} y={PAD.top} width={inner.w} height={inner.h} fill="transparent" />

            {/* Scale, so a value reads with no hover */}
            {ticksFor(scale.lo, scale.hi).map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={PAD.left + inner.w} y1={y(t)} y2={y(t)} stroke="var(--wg-line)" strokeWidth="1" />
                <text x={PAD.left - 6} y={y(t) + 3.5} textAnchor="end" className="tnum fill-faint text-[10px]">
                  {t}
                </text>
              </g>
            ))}
            <text x={PAD.left} y={H - 6} className="fill-faint text-[10px]">
              {DATE_FMT.format(new Date(scale.t0))}
            </text>
            <text x={PAD.left + inner.w} y={H - 6} textAnchor="end" className="fill-faint text-[10px]">
              {DATE_FMT.format(new Date(scale.t1))}
            </text>

            {/* The quiet races. A hovered line rises to the full text colour. */}
            {quiet.map((l) => (
              <path
                key={l.race}
                d={path(l.points)}
                fill="none"
                stroke={hovered === l.race ? "var(--wg-text)" : "var(--wg-text-faint)"}
                strokeWidth={hovered === l.race ? 2 : 1.5}
                strokeOpacity={hovered === l.race ? 1 : 0.55}
                strokeLinejoin="round"
              />
            ))}

            {/* The selected race, drawn last so it stays on top */}
            <path
              d={`${path(active.points)} L${x(last.date).toFixed(1)},${PAD.top + inner.h} L${x(first.date).toFixed(1)},${PAD.top + inner.h} Z`}
              fill="url(#mmr-fill)"
            />
            <path d={path(active.points)} fill="none" stroke="var(--wg-gold)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={x(last.date)} cy={y(last.mmr)} r="3" fill="var(--wg-gold)" stroke="var(--wg-bg)" strokeWidth="2" />

            {/* Direct labels in the gutter, joined to a line that ends early */}
            {labels.map((l) => {
              const on = l.race === active.race;
              const lit = on || hovered === l.race;
              return (
                <g key={l.race}>
                  {l.endX < gutterX - 10 ? (
                    <line
                      x1={l.endX}
                      y1={l.endY}
                      x2={gutterX - 2}
                      y2={l.y}
                      stroke="var(--wg-line)"
                      strokeWidth="1"
                      strokeDasharray="2 3"
                    />
                  ) : null}
                  <image href={`/factions/${l.race}.png`} x={gutterX} y={l.y - 7} width="14" height="14" opacity={lit ? 1 : 0.7}>
                    <title>{RACES[l.race].label}</title>
                  </image>
                  <text
                    x={gutterX + 18}
                    y={l.y + 3.5}
                    className={cn("tnum text-[10px]", on ? "fill-gold font-bold" : lit ? "fill-fg" : "fill-faint")}
                  >
                    {l.mmr}
                  </text>
                </g>
              );
            })}

            {/* A wide transparent path per line, so a line is easy to hit */}
            {drawn.map((l) => (
              <path
                key={l.race}
                d={path(l.points)}
                fill="none"
                stroke="transparent"
                strokeWidth="16"
                style={{ cursor: "pointer", pointerEvents: "stroke" }}
                onPointerEnter={() => setHovered(l.race)}
                onPointerLeave={() => setHovered(null)}
                onClick={() => setSelected(l.race)}
              />
            ))}

            {at != null ? (
              <g style={{ pointerEvents: "none" }}>
                <line x1={x(readAt)} x2={x(readAt)} y1={PAD.top} y2={PAD.top + inner.h} stroke="var(--wg-gold)" strokeOpacity="0.4" strokeDasharray="3 3" />
                <circle cx={x(readAt)} cy={y(activeMmr)} r="4.5" fill="var(--wg-bg)" stroke="var(--wg-gold)" strokeWidth="2" />
              </g>
            ) : null}
          </svg>
        )}
      </div>
    </div>
  );
}
