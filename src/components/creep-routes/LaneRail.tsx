"use client";

import { ChevronDown, Swords } from "lucide-react";
import type { DerivedNode } from "@/lib/creep-routes/derive";
import { HeroMeter, LevelLine } from "./HeroMeter";
import type { RouteStop } from "@/lib/creep-routes/types";
import { isPin, isWaypoint } from "@/lib/creep-routes/place.mjs";
import { cn } from "@/lib/utils";
import { PathTabs } from "./PathTabs";

/**
 * The lane rail of every route (`route-rows.mjs`): a 44px column at the left
 * of every row, added in front of today's row; a linear route has one lane. Lane a
 * (the main line) runs at x 14, lane b at 30, lane c at 46; 2px lines in
 * `--wg-line-strong`, dashed for a path not taken. The row's own node sits on its
 * lane at the summary line: a small neutral dot for a camp or base action, the
 * diamond for a waypoint, a red-ringed Swords node for an attack; a pin's node is off
 * the lane, a short dashed tick out to a dashed diamond. In the
 * builder (`builderRows`) a path's own lane is lit over its block: gold where
 * the next stop goes, light elsewhere.
 */

/** A lane through a row: `top`/`bottom` draw it above and below the node; "gold" and "light" light it (the builder). */
export type RailLine = { lane: string; top: boolean | "gold" | "light"; bottom: boolean | "gold" | "light"; off: boolean };

export const LANE_X: Record<string, number> = { "": 14, a: 14, b: 30, c: 46 };
/** Where the node sits: the middle of the summary line (16px row padding + half a line); 8px padding for a waypoint. */
const nodeY = (waypoint: boolean) => (waypoint ? 18 : 26);
const LINE = "absolute w-0.5 bg-line-strong";
/** A path not taken: the same lane, dashed. */
const DASHED = "absolute w-0 border-l-2 border-dashed border-line-strong";
const DASH = "4 3";
const LIT = { gold: "absolute w-0.5 bg-gold", light: "absolute w-0.5 bg-muted" };
const lineClass = (l: RailLine, end: RailLine["top"]) => (l.off ? DASHED : typeof end === "string" ? LIT[end] : LINE);
/** The builder's drop line on a row under a dragged row: gold at its top or bottom edge, a tint inside an empty path. */
export const DROP = "data-[drop=before]:shadow-[inset_0_2px_0_var(--wg-gold)] data-[drop=after]:shadow-[inset_0_-2px_0_var(--wg-gold)] data-[drop=in]:bg-gold/10";

/** A rail cell: the lane lines through a row, broken at `y` where the row's `node` sits on its `lane`. The `<li>` it sits in is `relative`. */
export function RailCell({ lines, lane = "a", y = 0, node }: { lines: RailLine[]; lane?: string; y?: number; node?: (x: number) => React.ReactNode }) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-11">
      {lines.map((l) => (
        <span key={l.lane}>
          {l.top ? <span className={lineClass(l, l.top)} style={{ left: LANE_X[l.lane] - 1, top: 0, height: y }} /> : null}
          {l.bottom ? <span className={lineClass(l, l.bottom)} style={{ left: LANE_X[l.lane] - 1, top: y, bottom: 0 }} /> : null}
        </span>
      ))}
      {node?.(LANE_X[lane] ?? 14)}
    </span>
  );
}

/** The builder's next-stop row on the rail: a dashed gold ring on its lane, level with the row's dashed number. */
export const SLOT_Y = 35;
export function SlotRail({ lines, lane }: { lines: RailLine[]; lane: string }) {
  return (
    <RailCell
      lines={lines}
      lane={lane}
      y={SLOT_Y}
      node={(x) => <span className="absolute size-3 rounded-full border-[1.5px] border-dashed border-gold bg-bg" style={{ left: x - 6, top: SLOT_Y - 6 }} />}
    />
  );
}

/** The rail cell of a stop row. */
export function StopRail({ lines, lane, stop }: { lines: RailLine[]; lane: string; stop: RouteStop }) {
  const waypoint = isWaypoint(stop);
  const y = nodeY(waypoint);
  return <RailCell lines={lines} lane={lane} y={y} node={(x) => <StopNode stop={stop} waypoint={waypoint} x={x} y={y} />} />;
}

function StopNode({ stop, waypoint, x, y }: { stop: RouteStop; waypoint: boolean; x: number; y: number }) {
  return (
    <>
      {stop.place?.kind === "attack" ? (
        <span
          className="absolute grid size-3.5 place-items-center rounded-full border-2 border-loss bg-bg text-loss"
          style={{ left: x - 7, top: y - 7 }}
        >
          <Swords size={8} strokeWidth={3} />
        </span>
      ) : isPin(stop) ? (
        <svg className="absolute overflow-visible" style={{ left: x, top: y - 6 }} width={34} height={12}>
          <line x1={0} y1={6} x2={20} y2={6} stroke="rgba(255,255,255,.55)" strokeWidth={1.5} strokeDasharray="2 2" />
          <rect x={21} y={2} width={8} height={8} transform="rotate(45 25 6)" fill="var(--wg-bg)" stroke="rgba(255,255,255,.85)" strokeWidth={1.5} strokeDasharray="2 1.5" />
        </svg>
      ) : waypoint ? (
        <span className="absolute size-2 rotate-45 rounded-[1px] border-2 border-white/85 bg-bg" style={{ left: x - 4, top: y - 4 }} />
      ) : (
        <span className="absolute size-1.5 rounded-full bg-line-strong" style={{ left: x - 3, top: y - 3 }} />
      )}
    </>
  );
}

/** A curve from the main line (x 14) out to a lane, or back in, in a 44x40 box stretched to the row. */
export function curve(x: number, out: boolean, from = 0) {
  return out ? `M14,${from} C14,${from + (40 - from) * 0.55} ${x},${40 - (40 - from) * 0.55} ${x},40` : `M${x},0 C${x},22 14,18 14,40`;
}

export function RailSvg({ children }: { children: React.ReactNode }) {
  return (
    <svg aria-hidden viewBox="0 0 44 40" preserveAspectRatio="none" className="pointer-events-none absolute inset-y-0 left-0 h-full w-11 overflow-visible">
      <g fill="none" stroke="var(--wg-line-strong)" strokeWidth={2}>
        {children}
      </g>
    </svg>
  );
}

/**
 * A split's caption row: no number, no band dot, no chevron. The rail curves every lane out of
 * the main line, a path not taken dashed. "or" and "xor" read "Choose a path" and carry the tab
 * strip as browser tabs (`role="tablist"`, arrow keys, the hero's level at each path's end): the
 * chosen tab is open at the bottom onto its path's rows, the `tabpanel` below; the others are
 * recessed. "and" reads "At the same time". The builder draws its own caption (`SplitCaption`).
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
  isOpen = false,
  onToggle,
}: {
  mode: "and" | "or" | "xor";
  arms: { label?: string; stops?: unknown[] }[];
  node?: DerivedNode;
  main: RailLine;
  lanes: { lane: string; off: boolean }[];
  stopKey: string;
  baseId: string;
  onChoose: (forkKey: string, arm: number) => void;
  /** An "and" heading: whether its paths' stops are open, and the toggle (none in the builder). */
  isOpen?: boolean;
  onToggle?: () => void;
}) {
  const choose = mode !== "and";
  const walked = node?.walked ?? 0;
  const name = mode !== "and" ? "Choose one path" : "Take all paths simultaneously";
  return (
    <li data-split={stopKey} className={cn("relative min-h-8 border-t border-line/40 pl-[60px] pr-4 first:border-t-0 sm:pr-5", choose ? "pt-1.5" : "py-3")}>
      <ForkRail main={main} lanes={lanes} />
      {choose
        ? lanes.map((l) => (
            <span key={l.lane} aria-hidden className="absolute bottom-0 text-[9px] font-bold leading-none text-faint" style={{ left: LANE_X[l.lane] + 3 }}>
              {l.lane}
            </span>
          ))
        : null}
      {choose ? (
        <>
          <span className="block pb-1.5 text-[0.74rem] uppercase tracking-[0.06em] text-faint">{name}</span>
          <PathTabs
            labels={arms.map((arm) => arm.label ?? "")}
            shown={walked}
            onShow={(a) => onChoose(stopKey, a)}
            tabId={(a) => `${baseId}-tab-${stopKey}-${a}`}
            panelId={`${baseId}-panel-${stopKey}`}
            name={name}
            after={(a) => (node?.arms[a] ? <span className="tnum shrink-0 text-[0.8rem] text-muted">Lv {node.arms[a].levelAfter}</span> : null)}
            className="-ml-2.5 -mr-2 sm:-mr-3"
          />
        </>
      ) : (
        // One disclosure for every path, with the hero after them all: a stop's level line closed, its meter open.
        <div className="relative grid grid-cols-[minmax(0,1fr)_1.25rem] gap-x-3">
          {onToggle ? (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={isOpen}
              aria-controls={`${baseId}-block-${stopKey}`}
              aria-label={`${name}${node ? `, hero Lv ${node.levelAfter}, ${node.xpBefore + node.xpGained} xp` : ""}`}
              className="absolute inset-0 cursor-pointer rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
            />
          ) : null}
          <div className={cn("pointer-events-none relative flex min-w-0 flex-wrap justify-between gap-3", isOpen ? "items-start" : "items-center")}>
            <span className="pt-0.5 text-[0.74rem] uppercase tracking-[0.06em] text-faint">{name}</span>
            {node && isOpen ? <HeroMeter level={node.levelAfter} xp={node.xpBefore + node.xpGained} /> : null}
            {node && !isOpen ? <LevelLine level={node.levelAfter} xp={node.xpBefore + node.xpGained} leveled={node.levelAfter > node.levelBefore} /> : null}
          </div>
          {onToggle ? (
            <span aria-hidden className={cn("relative grid size-5 place-items-center self-start", isOpen ? "text-gold" : "text-faint")}>
              <ChevronDown size={16} className={cn("transition-transform motion-reduce:transition-none", isOpen && "rotate-180")} />
            </span>
          ) : <span />}
        </div>
      )}
    </li>
  );
}

/** A split's fork on the rail: lane a straight on (from the row's middle when the split opens the list), the other lanes curving out of it. */
export function ForkRail({ main, lanes }: { main?: RailLine; lanes: { lane: string; off: boolean }[] }) {
  const from = main?.top ? 0 : 20;
  return (
    <RailSvg>
      {lanes.map((l) =>
        l.lane === "a" ? (
          <path key="a" d={`M14,${from} V40`} strokeDasharray={l.off ? DASH : undefined} vectorEffect="non-scaling-stroke" />
        ) : (
          <path key={l.lane} d={curve(LANE_X[l.lane], true, from)} strokeDasharray={l.off ? DASH : undefined} vectorEffect="non-scaling-stroke" />
        ),
      )}
    </RailSvg>
  );
}

/** The rail curving the shown lanes back into the main line before the first shared stop. */
export function JoinRow({ lanes }: { lanes: { lane: string; off: boolean }[] }) {
  return (
    <li aria-hidden="true" className="relative h-6 border-t border-line/40 first:border-t-0">
      <JoinRail lanes={lanes} />
    </li>
  );
}

/** A split's join on the rail: lane a straight through, the other lanes curving back into it. */
export function JoinRail({ lanes }: { lanes: { lane: string; off: boolean }[] }) {
  return (
    <RailSvg>
      {lanes.map((l) =>
        l.lane === "a" ? (
          <path key="a" d="M14,0 V40" strokeDasharray={l.off ? DASH : undefined} vectorEffect="non-scaling-stroke" />
        ) : (
          <path key={l.lane} d={curve(LANE_X[l.lane], false)} strokeDasharray={l.off ? DASH : undefined} vectorEffect="non-scaling-stroke" />
        ),
      )}
    </RailSvg>
  );
}
