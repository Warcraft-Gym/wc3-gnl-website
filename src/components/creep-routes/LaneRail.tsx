"use client";

import { useRef } from "react";
import { Swords } from "lucide-react";
import type { DerivedNode } from "@/lib/creep-routes/derive";
import type { RouteStop } from "@/lib/creep-routes/types";
import { isWaypoint } from "@/lib/creep-routes/place.mjs";
import { cn } from "@/lib/utils";

/**
 * The lane rail of a route with a split (`route-rows.mjs`): a
 * 44px column at the left of every row, added in front of today's row. Lane a
 * (the main line) runs at x 14, lane b at 30, lane c at 46; 2px lines in
 * `--wg-line-strong`, at 35% off the chosen way. The row's own node sits on its
 * lane at the summary line: a small neutral dot for a camp or base action, the
 * diamond for a waypoint, a red-ringed Swords node for an attack.
 */

export type RailLine = { lane: string; top: boolean; bottom: boolean; off: boolean };

const LANE_X: Record<string, number> = { "": 14, a: 14, b: 30, c: 46 };
/** Where the node sits: the middle of the summary line (16px row padding + half a line); 8px padding for a waypoint. */
const nodeY = (waypoint: boolean) => (waypoint ? 18 : 26);
const LINE = "absolute w-0.5 bg-line-strong";

/** The rail cell of a stop row; the `<li>` it sits in is `relative`. */
export function StopRail({ lines, lane, stop }: { lines: RailLine[]; lane: string; stop: RouteStop }) {
  const waypoint = isWaypoint(stop);
  const y = nodeY(waypoint);
  const x = LANE_X[lane] ?? 14;
  return (
    <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-11">
      {lines.map((l) => (
        <span key={l.lane} className={cn(l.off && "opacity-35")}>
          {l.top ? <span className={LINE} style={{ left: LANE_X[l.lane] - 1, top: 0, height: y }} /> : null}
          {l.bottom ? <span className={LINE} style={{ left: LANE_X[l.lane] - 1, top: y, bottom: 0 }} /> : null}
        </span>
      ))}
      {stop.place?.kind === "attack" ? (
        <span
          className="absolute grid size-3.5 place-items-center rounded-full border-2 border-loss bg-bg text-loss"
          style={{ left: x - 7, top: y - 7 }}
        >
          <Swords size={8} strokeWidth={3} />
        </span>
      ) : waypoint ? (
        <span className="absolute size-2 rotate-45 rounded-[1px] border-2 border-white/85 bg-bg" style={{ left: x - 4, top: y - 4 }} />
      ) : (
        <span className="absolute size-1.5 rounded-full bg-line-strong" style={{ left: x - 3, top: y - 3 }} />
      )}
    </span>
  );
}

/** A curve from the main line (x 14) out to a lane, or back in, in a 44x40 box stretched to the row. */
function curve(x: number, out: boolean, from = 0) {
  return out ? `M14,${from} C14,${from + (40 - from) * 0.55} ${x},${40 - (40 - from) * 0.55} ${x},40` : `M${x},0 C${x},22 14,18 14,40`;
}

function RailSvg({ children }: { children: React.ReactNode }) {
  return (
    <svg aria-hidden viewBox="0 0 44 40" preserveAspectRatio="none" className="pointer-events-none absolute inset-y-0 left-0 h-full w-11 overflow-visible">
      <g fill="none" stroke="var(--wg-line-strong)" strokeWidth={2}>
        {children}
      </g>
    </svg>
  );
}

/**
 * A split's caption row: no number, no band dot, no chevron. The rail curves the shown lanes
 * out of the main line (only the chosen way's lane in "xor"; the others at 35% in "or"). "or" and
 * "xor" read "Choose a way" and carry the tab strip (`role="tablist"`, arrow keys, the hero's
 * level at each way's end); "and" reads "At the same time".
 */
export function SplitRow({
  mode,
  arms,
  node,
  main,
  lanes,
  stopKey,
  baseId,
  onChoose,
}: {
  mode: "and" | "or" | "xor";
  arms: { label?: string }[];
  node?: DerivedNode;
  main: RailLine;
  lanes: { lane: string; off: boolean }[];
  stopKey: string;
  baseId: string;
  onChoose: (forkKey: string, arm: number) => void;
}) {
  const choose = mode !== "and";
  const walked = node?.walked ?? 0;
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const name = choose ? "Choose a way" : "At the same time";
  // Arrow keys move the selection along the tab strip, Home and End to its ends.
  const onTabKey = (e: React.KeyboardEvent, a: number) => {
    const last = arms.length - 1;
    const next = e.key === "ArrowRight" ? (a === last ? 0 : a + 1) : e.key === "ArrowLeft" ? (a === 0 ? last : a - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : null;
    if (next === null) return;
    e.preventDefault();
    onChoose(stopKey, next);
    tabs.current[next]?.focus();
  };
  const from = main.top ? 0 : 20;
  return (
    <li data-split={stopKey} className="relative min-h-8 border-t border-line/40 py-1.5 pl-[60px] pr-4 first:border-t-0 sm:pr-5">
      <RailSvg>
        {lanes.map((l) =>
          l.lane === "a" ? (
            <path key="a" d={`M14,${from} V40`} opacity={l.off ? 0.35 : undefined} vectorEffect="non-scaling-stroke" />
          ) : (
            <path key={l.lane} d={curve(LANE_X[l.lane], true, from)} opacity={l.off ? 0.35 : undefined} vectorEffect="non-scaling-stroke" />
          ),
        )}
      </RailSvg>
      {choose
        ? lanes.map((l) => (
            <span key={l.lane} aria-hidden className="absolute bottom-0 text-[9px] font-bold leading-none text-faint" style={{ left: LANE_X[l.lane] + 3 }}>
              {l.lane}
            </span>
          ))
        : null}
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-[0.74rem] uppercase tracking-[0.06em] text-faint">{name}</span>
        {choose ? (
          <div role="tablist" aria-label={name} className="flex flex-wrap gap-x-4">
            {arms.map((arm, a) => {
              const chosen = a === walked;
              return (
                <button
                  key={a}
                  ref={(el) => {
                    tabs.current[a] = el;
                  }}
                  id={`${baseId}-tab-${stopKey}-${a}`}
                  type="button"
                  role="tab"
                  aria-selected={chosen}
                  tabIndex={chosen ? 0 : -1}
                  onClick={() => onChoose(stopKey, a)}
                  onKeyDown={(e) => onTabKey(e, a)}
                  className={cn(
                    "relative inline-flex max-w-full items-baseline gap-1.5 pb-1 pt-0.5 text-left text-[0.84rem] transition-colors",
                    "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-gold after:opacity-0",
                    "rounded-t focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold",
                    chosen ? "text-fg after:opacity-100" : "text-muted hover:text-fg",
                  )}
                >
                  <span>{arm.label}</span>
                  {node?.arms[a] ? <span className="tnum shrink-0 text-[0.8rem] text-muted">Lv {node.arms[a].levelAfter}</span> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </li>
  );
}

/** The rail curving the shown lanes back into the main line before the first shared stop; no text. */
export function JoinRow({ lanes }: { lanes: { lane: string; off: boolean }[] }) {
  return (
    <li aria-hidden className="relative h-6 border-t border-line/40 first:border-t-0">
      <RailSvg>
        {lanes.map((l) =>
          l.lane === "a" ? (
            <path key="a" d="M14,0 V40" opacity={l.off ? 0.35 : undefined} vectorEffect="non-scaling-stroke" />
          ) : (
            <path key={l.lane} d={curve(LANE_X[l.lane], false)} opacity={l.off ? 0.35 : undefined} vectorEffect="non-scaling-stroke" />
          ),
        )}
      </RailSvg>
    </li>
  );
}
