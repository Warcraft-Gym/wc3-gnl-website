"use client";

import { ArrowDown, ArrowUp, Trash2, X } from "lucide-react";
import type { DropProps } from "./RouteStepTable";
import { DROP, ForkRail, JoinRail, RailCell, type RailLine } from "./LaneRail";
import { SAME_CAMP_LINE } from "./stop-rows";
import { KindLine, QuietAdd } from "./NextStopRow";
import { PathTabs } from "./PathTabs";
import { cn } from "@/lib/utils";
import type { DerivedNode } from "@/lib/creep-routes/derive";
import { LevelLine } from "./HeroMeter";

/**
 * The builder's paths block (`RouteStepTable` with `builderRows`). The top row
 * holds the kind switch, move and remove. "Choose one path" shows a tab strip
 * (`PathTabs`, the reader's look) and only the shown path, in a panel: its
 * heading row (the name field, what it holds, its x), its stops and its add
 * line. "Take all paths simultaneously" lists every path one under the other,
 * a separator row between two.
 */

/** The builder's controls of one split (`RouteEditor`). */
export type SplitEdit = {
  /** The block's row id: its name fields carry `data-path-field="<id>.<arm>"`. */
  blockId: number;
  onMode: (mode: "and" | "or") => void;
  /** A path's label as typed (the route's own is trimmed). */
  label: (arm: number) => string;
  onLabel: (arm: number, label: string) => void;
  /** Trims the label once, when its field loses focus. */
  onLabelBlur: (arm: number) => void;
  /** The submit check's message for a path: its label, else its stops. */
  pathError: (arm: number) => string | undefined;
  /** The submit check's message for the whole split. */
  error?: string;
  /** Absent at the path cap. */
  onAddPath?: () => void;
  /** Every path heading's x; removing one of two paths leaves the other's stops in the split's place. */
  onRemovePath: (arm: number) => void;
  /** Shows a path and makes its end the target. */
  onAddStops: (arm: number) => void;
  onMove: (dir: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onRemove: () => void;
  /** "Remove split, keep path A": path A always stays. */
  removeLabel: string;
  /** Every path is the same camps in the same order: a line under the chips, not blocking. */
  sameCamp?: boolean;
};

type Dnd = { handle?: React.ReactNode; props: DropProps };
const ROW = "relative pl-[60px] pr-4 sm:pr-5";
const ICON = "grid size-7 place-items-center rounded border border-line text-muted hover:text-gold disabled:opacity-30";
const KINDS = [
  { id: "or", label: "Choose one path" },
  { id: "and", label: "Take all paths simultaneously" },
] as const;
/** A path's letter: A, B, C in a pick-one split; 1, 2, 3 at the same time. */
export const pathName = (mode: string, arm: number) => (mode === "and" ? String(arm + 1) : "ABC"[arm]);

/** A block's top row: the grip, the kind switch, move and remove; under it, for "Choose one path", the tab strip. */
export function SplitCaption({
  stopKey,
  mode,
  main,
  lanes,
  edit,
  dnd,
  shown,
  paths,
  tabId,
  panelId,
}: {
  stopKey: string;
  mode: string;
  main?: RailLine;
  lanes: { lane: string; off: boolean }[];
  edit: SplitEdit;
  dnd?: Dnd;
  shown: number;
  paths: number;
  tabId: (arm: number) => string;
  panelId: string;
}) {
  const and = mode === "and";
  return (
    <li data-split={stopKey} {...dnd?.props} className={cn(ROW, "border-t border-line/40 pt-2 first:border-t-0", and ? "pb-2" : "pb-0", DROP)}>
      <ForkRail main={main} lanes={lanes} />
      {dnd?.handle ? <span className="absolute left-[44px] top-3.5">{dnd.handle}</span> : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:flex-nowrap">
        <div role="radiogroup" aria-label="Kind of paths" className="grid min-w-0 basis-full grid-cols-2 overflow-hidden rounded border border-line sm:max-w-[26rem] sm:flex-1 sm:basis-auto">
          {KINDS.map((m) => {
            const on = (m.id === "and") === and;
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => edit.onMode(m.id)}
                className={cn(
                  "flex min-h-9 min-w-0 flex-col items-start justify-center gap-1 px-2 py-1 text-left text-[0.75rem] leading-tight sm:flex-row sm:items-center sm:gap-[7px] sm:text-[0.8rem] [&+&]:border-l [&+&]:border-line",
                  on ? "bg-gold/10 text-fg" : "text-muted hover:text-fg",
                )}
              >
                <KindLine mode={m.id} className={on ? "text-gold" : "text-muted"} />
                {m.label}
              </button>
            );
          })}
        </div>
        <span className="ml-auto flex gap-1">
          <button type="button" onClick={() => edit.onMove(-1)} disabled={!edit.canMoveUp} aria-label="Move paths up" className={ICON}>
            <ArrowUp size={14} />
          </button>
          <button type="button" onClick={() => edit.onMove(1)} disabled={!edit.canMoveDown} aria-label="Move paths down" className={ICON}>
            <ArrowDown size={14} />
          </button>
          <button type="button" onClick={edit.onRemove} aria-label={edit.removeLabel} title={edit.removeLabel} className={cn(ICON, "hover:border-loss/60 hover:text-loss")}>
            <Trash2 size={14} />
          </button>
        </span>
      </div>
      {and ? <p className="mt-1 text-[0.7rem] text-faint">Paths taken together share one XP total; the order of kills is unknown.</p> : null}
      {edit.sameCamp ? <p className="mt-1 text-[0.7rem] text-faint">{SAME_CAMP_LINE}</p> : null}
      {edit.error ? <p className="mt-1 text-[0.7rem] text-loss">{edit.error}</p> : null}
      {and ? null : (
        <PathTabs
          labels={Array.from({ length: paths }, (_, a) => edit.label(a))}
          shown={shown}
          onShow={edit.onAddStops}
          tabId={tabId}
          panelId={panelId}
          onAdd={edit.onAddPath}
          className="-ml-2.5 -mr-2 mt-2 sm:-mr-3"
        />
      )}
    </li>
  );
}

/** Where the letter disc sits: the middle of the name field (8px padding + half of 32px). */
const HEAD_Y = 24;

/** What a path holds: "2 stops", "1 stop · 1 waypoint", "1 waypoint", "empty". */
const held = (count: number, waypoints: number) =>
  [count ? `${count} ${count === 1 ? "stop" : "stops"}` : "", waypoints ? `${waypoints} ${waypoints === 1 ? "waypoint" : "waypoints"}` : ""]
    .filter(Boolean)
    .join(" · ") || "empty";

/** A path's heading row: its letter on its lane, its name (a field in a pick-one split), what it holds. */
export function PathHead({ mode, arm, here, count, waypoints, lines, lane, edit, dnd }: { mode: string; arm: number; here: boolean; count: number; waypoints: number; lines: RailLine[]; lane: string; edit: SplitEdit; dnd?: Dnd }) {
  const name = pathName(mode, arm);
  const error = edit.pathError(arm);
  return (
    <li data-path-head={name} {...dnd?.props} className={cn(ROW, "border-t border-line/40 py-2", DROP)}>
      <RailCell
        lines={lines}
        lane={lane}
        y={HEAD_Y}
        node={mode !== "and" ? undefined : (x) => (
          <span
            className={cn("absolute grid size-[18px] place-items-center rounded-full border bg-bg text-[10px] font-bold leading-none", here ? "border-gold text-gold" : "border-line-strong text-fg")}
            style={{ left: x - 9, top: HEAD_Y - 9 }}
          >
            {name}
          </span>
        )}
      />
      <div className="flex min-h-8 items-center gap-3">
        {mode === "and" ? (
          <span className="text-sm font-medium text-fg">{arm === 0 ? "The hero's path" : "Units without the hero"}</span>
        ) : (
          <input
            aria-label={`Path ${name} name`}
            data-path-field={`${edit.blockId}.${arm}`}
            placeholder={`Name, e.g. ${["Safe", "Risky", "vs. Mirror Image"][arm]}`}
            value={edit.label(arm)}
            onChange={(e) => edit.onLabel(arm, e.target.value)}
            onBlur={() => edit.onLabelBlur(arm)}
            maxLength={60}
            className={cn(
              "h-8 min-w-0 flex-1 rounded border bg-surface/60 px-2.5 text-sm text-fg placeholder:text-faint focus:border-gold/60 focus:outline-none sm:max-w-[22rem]",
              error ? "border-loss" : "border-line",
            )}
          />
        )}
        <span className="tnum shrink-0 text-[0.8rem] text-muted">{held(count, waypoints)}</span>
        <button
          type="button"
          onClick={() => edit.onRemovePath(arm)}
          aria-label={`Remove path ${name}`}
          title={`Remove path ${name}`}
          className="grid size-7 shrink-0 place-items-center rounded text-faint hover:text-loss"
        >
          <X size={14} />
        </button>
      </div>
      {error ? <p className="mt-1 text-[0.7rem] text-loss">{error}</p> : null}
    </li>
  );
}

/** Between two blocks: "or instead of the path above", "and at the same time". */
export function PathSep({ mode, lines }: { mode: string; lines: RailLine[] }) {
  return (
    <li className={cn(ROW, "border-t border-line/40 py-1.5")}>
      <RailCell lines={lines} />
      <p className="text-[0.8rem]">
        <span className="font-medium text-gold">{mode === "and" ? "and" : "or"}</span>{" "}
        <span className="text-muted">{mode === "and" ? "at the same time" : "instead of the path above"}</span>
      </p>
    </li>
  );
}

/** The end of a path that is not the target: a quiet button that makes it the target. */
export function PathAdd({ mode, arm, empty, lines, onAdd, dnd }: { mode: string; arm: number; empty: boolean; lines: RailLine[]; onAdd: () => void; dnd?: Dnd }) {
  const name = pathName(mode, arm);
  return (
    <li {...dnd?.props} className={cn(ROW, "py-2", DROP)}>
      <RailCell lines={lines} />
      <QuietAdd onClick={onAdd}>{empty ? `Path ${name} is empty. Add its stops` : `Add stops to path ${name}`}</QuietAdd>
    </li>
  );
}

/** The row that closes a block: the lanes curve back into lane a when stops follow; a same-time block shows its shared level. */
export function AfterSplit({ lanes, joins, node }: { lanes: { lane: string; off: boolean }[]; joins: boolean; follows: boolean; node?: DerivedNode }) {
  if (!joins && !node) return null;
  return (
    <li className={cn(ROW, node ? "py-2" : "h-3")}>
      {joins ? <JoinRail lanes={lanes} /> : null}
      {node ? <LevelLine level={node.levelAfter} xp={node.xpBefore + node.xpGained} leveled={node.levelAfter > node.levelBefore} /> : null}
    </li>
  );
}
