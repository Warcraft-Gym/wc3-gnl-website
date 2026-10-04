"use client";

import { ArrowDown, ArrowUp, Plus, Split, Trash2, X } from "lucide-react";
import type { DropProps } from "./RouteStepTable";
import { DROP, ForkRail, JoinRail, RailCell, type RailLine } from "./LaneRail";
import { SAME_CAMP_LINE } from "./stop-rows";
import { cn } from "@/lib/utils";
import type { DerivedNode } from "@/lib/creep-routes/derive";
import { LevelLine } from "./HeroMeter";

/**
 * The builder's split (`RouteStepTable` with `builderRows`): every path shows,
 * stacked on the lane rail. The caption row holds the mode chips, move and
 * remove; each path is a block with a heading row (its name, on its lane's
 * letter disc), its stops and an add row; "or" / "and" rows sit between blocks;
 * the "After the split" row closes it. The reader and Preview keep the tabs
 * (`SplitRow`).
 */

/** The builder's controls of one split (`RouteEditor`). */
export type SplitEdit = {
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
  /** Puts the next-stop row at the end of a path. */
  onAddStops: (arm: number) => void;
  /** Puts the next-stop row right after the split. */
  onContinue: () => void;
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
const ADD = "inline-flex min-h-7 items-center gap-1 rounded border border-dashed border-line px-2 text-left text-xs text-muted hover:border-gold/50 hover:text-gold";
const CHIPS = [
  { id: "or", label: "Choose a path" },
  { id: "and", label: "At the same time" },
] as const;
/** A path's letter: A, B, C in a pick-one split; 1, 2, 3 at the same time. */
export const pathName = (mode: string, arm: number) => (mode === "and" ? String(arm + 1) : "ABC"[arm]);

/** The split's caption row: the split glyph, the two mode chips, move and remove. */
export function SplitCaption({ stopKey, mode, main, lanes, edit, dnd }: { stopKey: string; mode: string; main?: RailLine; lanes: { lane: string; off: boolean }[]; edit: SplitEdit; dnd?: Dnd }) {
  const and = mode === "and";
  return (
    <li data-split={stopKey} {...dnd?.props} className={cn(ROW, "border-t border-line/40 py-2 first:border-t-0", DROP)}>
      <ForkRail main={main} lanes={lanes} />
      {dnd?.handle ? <span className="absolute left-[44px] top-3.5">{dnd.handle}</span> : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-fg">
          <Split aria-hidden size={16} className="text-gold" /> Split
        </span>
        <div role="radiogroup" aria-label="Kind of split" className="flex flex-wrap gap-1">
          {CHIPS.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={(m.id === "and") === and}
              onClick={() => edit.onMode(m.id)}
              className={cn("h-7 rounded border border-arcane/40 px-2 text-[0.72rem]", (m.id === "and") === and ? "bg-arcane/10 text-fg" : "text-arcane hover:bg-arcane/5")}
            >
              {m.label}
            </button>
          ))}
        </div>
        <span className="ml-auto flex gap-1">
          <button type="button" onClick={() => edit.onMove(-1)} disabled={!edit.canMoveUp} aria-label="Move split up" className={ICON}>
            <ArrowUp size={14} />
          </button>
          <button type="button" onClick={() => edit.onMove(1)} disabled={!edit.canMoveDown} aria-label="Move split down" className={ICON}>
            <ArrowDown size={14} />
          </button>
          <button type="button" onClick={edit.onRemove} aria-label={edit.removeLabel} title={edit.removeLabel} className={cn(ICON, "hover:border-loss/60 hover:text-loss")}>
            <Trash2 size={14} />
          </button>
        </span>
      </div>
      {and ? <p className="mt-1 text-[0.7rem] text-faint">Paths at the same time share one XP total; the order of kills is unknown.</p> : null}
      {edit.sameCamp ? <p className="mt-1 text-[0.7rem] text-faint">{SAME_CAMP_LINE}</p> : null}
      {edit.error ? <p className="mt-1 text-[0.7rem] text-loss">{edit.error}</p> : null}
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
        node={(x) => (
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

/** The end of a block whose path does not hold the next-stop row: a quiet button that moves it there. */
export function PathAdd({ mode, arm, empty, lines, onAdd, dnd }: { mode: string; arm: number; empty: boolean; lines: RailLine[]; onAdd: () => void; dnd?: Dnd }) {
  const name = pathName(mode, arm);
  return (
    <li {...dnd?.props} className={cn(ROW, "py-2", DROP)}>
      <RailCell lines={lines} />
      <button type="button" onClick={onAdd} className={ADD}>
        <Plus aria-hidden size={13} /> {empty ? `Path ${name} is empty. Add its stops` : `Add stops to path ${name}`}
      </button>
    </li>
  );
}

/** "Add a third path", under a pick-one split's last block. */
export function AddThirdPath({ lines, onAdd }: { lines: RailLine[]; onAdd: () => void }) {
  return (
    <li className={cn(ROW, "pb-2")}>
      <RailCell lines={lines} />
      <button type="button" onClick={onAdd} className={ADD}>
        <Plus aria-hidden size={13} /> Add a third path
      </button>
    </li>
  );
}

/** The row that closes a split: the lanes curve back into lane a when stops follow; "Continue the route here" puts the next-stop row there. */
export function AfterSplit({ lanes, joins, follows, slotAfter, node, onContinue }: { lanes: { lane: string; off: boolean }[]; joins: boolean; follows: boolean; slotAfter: boolean; node?: DerivedNode; onContinue: () => void }) {
  return (
    <li className={cn(ROW, "border-t border-dashed border-line/60 py-2.5")}>
      {joins ? <JoinRail lanes={lanes} /> : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <p className="min-w-0 flex-1 text-[0.8rem] text-muted">
          <span className="font-medium text-fg">After the split.</span> Stops below are taken on every path.
          {follows ? null : " Leave it empty if each path ends the route."}
        </p>
      </div>
      {node ? <LevelLine level={node.levelAfter} xp={node.xpBefore + node.xpGained} leveled={node.levelAfter > node.levelBefore} className="mt-2" /> : null}
      {slotAfter ? null : (
        <button type="button" onClick={onContinue} className={cn(ADD, "mt-1.5")}>
          <Plus aria-hidden size={13} /> Continue the route here
        </button>
      )}
    </li>
  );
}
