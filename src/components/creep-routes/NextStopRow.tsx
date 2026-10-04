"use client";

import { useEffect, useId, useRef } from "react";
import { Flag, MapPin, Split, X, Zap } from "lucide-react";
import { canStartSplit, type SplitSetup } from "./stop-rows";
import { MAX_PATHS } from "@/lib/creep-routes/caps.mjs";
import { cn } from "@/lib/utils";

const BUTTON = "inline-flex h-8 items-center gap-1.5 rounded border px-2.5 text-xs font-medium aria-disabled:opacity-40";
export const GOLD_BUTTON = cn(BUTTON, "border-gold/50 text-gold hover:bg-gold/10");
export const QUIET_BUTTON = cn(BUTTON, "border-line text-muted hover:text-fg");
/** The dashed gold box of the next-stop row and the split form. */
export const SLOT_BOX = "rounded border border-dashed border-gold/60 bg-gold/[0.04] p-3";

/**
 * The builder's next-stop row (`RouteEditor`): one dashed gold row that sits in
 * the list where the next map click lands (`addTarget`), with the number that
 * stop will take in a dashed circle (`nextStop`). It holds the two adds that are
 * not a camp click: "Waypoint" opens the waypoint chooser, "Split here" the split
 * form (top level only, splits are one level deep). While the map is armed for a
 * waypoint on the route or a pin the row asks for its spot.
 */
export function NextStopRow({
  label,
  line,
  toEnd,
  onToEnd,
  inPath,
  armed,
  blocked,
  capLine,
  onWaypoint,
  onCancel,
  onSplit,
}: {
  label: string;
  /** "Adds stop 3 after stop 2." (`nextStop`). */
  line: string;
  /** The row is not at the end: "Add at the end instead" clears the selection. */
  toEnd: boolean;
  onToEnd: () => void;
  /** The row sits in a split's path: no "Split here". */
  inPath: boolean;
  /** A waypoint on the route or a pin waits for its spot on the map. */
  armed: WayType | null;
  /** At the row cap the two adds do nothing. */
  blocked: boolean;
  capLine?: string | null;
  onWaypoint: () => void;
  onCancel: () => void;
  onSplit: () => void;
}) {
  return (
    <div className={SLOT_BOX}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="tnum grid size-7 shrink-0 place-items-center rounded-full border-[1.5px] border-dashed border-gold text-[0.75rem] font-bold text-gold"
        >
          {armed === "pin" ? <Flag size={14} /> : armed ? <MapPin size={14} /> : label}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-7 text-fg">
            {armed === "pin" ? (
              "Click the spot to pin"
            ) : armed ? (
              "Click the place on the map"
            ) : (
              <>
                <span className="lg:hidden">Tap a camp on the map above</span>
                <span className="hidden lg:inline">Click a camp on the map</span>
              </>
            )}
          </p>
          <p aria-live="polite" className="text-[0.8rem] text-muted">
            {armed === "pin" ? "Any spot. The line skips it." : armed ? "Bases, gold mines and shops snap to their spot." : line}
            {!armed && toEnd ? (
              <>
                {" "}
                <button type="button" onClick={onToEnd} className="text-gold underline underline-offset-2 hover:text-fg">
                  Add at the end instead
                </button>
              </>
            ) : null}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {armed ? (
              <button type="button" onClick={onCancel} data-focus="cancel" className={QUIET_BUTTON}>
                Cancel
              </button>
            ) : (
              <>
                <button type="button" onClick={onWaypoint} aria-disabled={blocked} data-focus="waypoint" className={GOLD_BUTTON}>
                  <MapPin aria-hidden size={14} /> Waypoint
                </button>
                {inPath ? null : (
                  <button type="button" onClick={onSplit} aria-disabled={blocked} data-focus="split" className={GOLD_BUTTON}>
                    <Split aria-hidden size={14} /> Split here
                  </button>
                )}
              </>
            )}
          </div>
          {capLine ? <p className="mt-2 text-[0.7rem] text-faint">{capLine}</p> : null}
        </div>
      </div>
    </div>
  );
}

/** The two kinds of split, each with its mini diagram: one path dashed (pick one) or both solid. */
// A waypoint is a step at a place with no creeps. The line goes through it, or it is a pin the line skips.
// A step with no place is an action. Who goes is Bring, as on any stop.
export type WayType = "route" | "pin" | "none";
export const WAY_TYPES = [
  { id: "route", short: "On the route", long: "On the route", line: "The line goes through it.", Glyph: MapPin },
  { id: "pin", short: "Pin", long: "A pin", line: "Marks a spot. The line skips it.", Glyph: Flag },
  { id: "none", short: "No place", long: "No place", line: "An action, e.g. TP home.", Glyph: Zap },
] as const;

/**
 * "Waypoint" turns the next-stop row into this chooser; nothing is inserted yet. On the route and
 * A pin arm the map, No place adds an action row (`RouteEditor`). Escape and "Cancel" close it.
 */
export function WaypointChooser({ after, noPlaceCap, onChoose, onCancel }: { after: string; noPlaceCap?: string | null; onChoose: (type: WayType) => void; onCancel: () => void }) {
  return (
    <div data-waypoint-chooser className={SLOT_BOX}>
      <p className="text-sm font-medium leading-7 text-fg">Waypoint {after}</p>
      <div className="mt-1 grid gap-2 sm:grid-cols-3">
        {WAY_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={t.id === "none" && Boolean(noPlaceCap)}
            onClick={() => onChoose(t.id)}
            data-focus={`way-${t.id}`}
            className="grid grid-cols-[1rem_minmax(0,1fr)] gap-x-2 rounded border border-line px-2.5 py-2 text-left hover:border-gold/60 hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <t.Glyph aria-hidden size={16} className="row-span-2 mt-0.5 text-gold" />
            <span className="text-sm font-medium text-fg">{t.long}</span>
            <span className="text-[0.75rem] leading-snug text-muted">{t.line}</span>
          </button>
        ))}
      </div>
      {noPlaceCap ? <p className="mt-2 text-[0.7rem] text-faint">{noPlaceCap}</p> : null}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <button type="button" onClick={onCancel} data-focus="cancel" className={QUIET_BUTTON}>
          Cancel
        </button>
      </div>
    </div>
  );
}

const MODES = [
  { id: "or", title: "Choose a path", line: <path d="M8 5 L14 9 H22 L28 5" strokeDasharray="2 2" /> },
  { id: "and", title: "At the same time", line: <path d="M8 5 L14 9 H22 L28 5" /> },
] as const;
const NAME_HINTS = ["e.g. Safe", "e.g. Risky", "e.g. vs. Mirror Image"];

/**
 * "Split here" turns the next-stop row into this form; nothing is inserted until
 * "Start path A" (`canStartSplit`: every pick-one path has a name). Escape and
 * "Cancel" close it (`RouteEditor`).
 */
export function SplitForm({
  after,
  setup,
  onChange,
  onStart,
  onCancel,
}: {
  /** Where the split goes: "after stop 3", "at the start" (`nextStop`). */
  after: string;
  setup: SplitSetup;
  onChange: (setup: SplitSetup) => void;
  onStart: () => void;
  onCancel: () => void;
}) {
  const id = useId();
  const pick = setup.mode === "or";
  // "Add a third path" puts focus in the new name field, its x back on "Add a third path" (each button unmounts).
  const box = useRef<HTMLDivElement>(null);
  const focusTo = useRef<string | null>(null);
  useEffect(() => {
    const q = focusTo.current;
    if (!q) return;
    focusTo.current = null;
    box.current?.querySelector<HTMLElement>(q)?.focus();
  });
  return (
    <div ref={box} data-split-form className={SLOT_BOX}>
      <p className="text-sm font-medium leading-7 text-fg">Split {after}</p>
      <fieldset className="mt-1">
        <legend className="sr-only">Kind of split</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {MODES.map((m) => (
            <label
              key={m.id}
              className="flex cursor-pointer items-center gap-2 rounded border border-line px-2.5 py-2 hover:border-gold/40 has-[:checked]:border-gold/60 has-[:checked]:bg-gold/10"
            >
              <input
                type="radio"
                name={`${id}-mode`}
                value={m.id}
                checked={setup.mode === m.id}
                onChange={() => onChange({ ...setup, mode: m.id })}
                className="accent-[var(--wg-gold)]"
              />
              <span className="flex-1 text-sm font-medium text-fg">{m.title}</span>
              <svg aria-hidden viewBox="0 0 34 10" className="h-2.5 w-[34px] shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M1 5 H8 L14 1 H22 L28 5 H33" />
                {m.line}
              </svg>
            </label>
          ))}
        </div>
      </fieldset>
      {pick ? (
        <div className="mt-3 space-y-2">
          {setup.names.map((name, a) => (
            <div key={a} className="flex items-center gap-1.5">
              <label className="flex min-w-0 flex-1 items-center gap-3">
                <span className="w-14 shrink-0 text-[0.8rem] text-muted">Path {"ABC"[a]}</span>
                <input
                  value={name}
                  onChange={(e) => onChange({ ...setup, names: setup.names.map((n, b) => (b === a ? e.target.value : n)) })}
                  placeholder={NAME_HINTS[a]}
                  maxLength={60}
                  autoFocus={a === 0}
                  data-path-name={a}
                  className="h-9 min-w-0 flex-1 rounded border border-line bg-surface/60 px-3 text-sm text-fg placeholder:text-faint focus:border-gold/60 focus:outline-none"
                />
              </label>
              {/* A third path can go again; Start then judges the two names left. */}
              {a === 2 ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange({ ...setup, names: setup.names.slice(0, 2) });
                    focusTo.current = "[data-add-path]";
                  }}
                  aria-label="Remove path C"
                  title="Remove path C"
                  className="grid size-7 shrink-0 place-items-center rounded text-faint hover:text-loss"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
          ))}
          {setup.names.length < MAX_PATHS ? (
            <button
              type="button"
              onClick={() => {
                onChange({ ...setup, names: [...setup.names, ""] });
                focusTo.current = `[data-path-name="${setup.names.length}"]`;
              }}
              data-add-path
              className="text-[0.75rem] text-gold underline underline-offset-2 hover:text-fg"
            >
              Add a third path
            </button>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-[0.8rem] text-muted">Path 1 is the hero&apos;s.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <button type="button" onClick={onStart} disabled={!canStartSplit(setup)} className="btn-gold inline-flex h-8 items-center rounded px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40">
          Start path {pick ? "A" : "1"}
        </button>
        <button type="button" onClick={onCancel} className={QUIET_BUTTON}>
          Cancel
        </button>
      </div>
    </div>
  );
}
