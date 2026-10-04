"use client";

import { useEffect, useId, useRef } from "react";
import { Crosshair, MapPin, Split, X } from "lucide-react";
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
 * not a camp click: "Waypoint" arms the map, "Split here" opens the split form
 * (top level only, splits are one level deep). While a waypoint is armed the
 * row asks for its spot.
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
  /** A waypoint waits for its spot on the map. */
  armed: boolean;
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
          {armed ? <Crosshair size={14} /> : label}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-7 text-fg">
            {armed ? (
              "Click the map where it happens"
            ) : (
              <>
                <span className="lg:hidden">Tap a camp on the map above</span>
                <span className="hidden lg:inline">Click a camp on the map</span>
              </>
            )}
          </p>
          <p aria-live="polite" className="text-[0.8rem] text-muted">
            {armed ? "Bases, gold mines and shops snap to their spot." : line}
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

const MODES = [
  { id: "or", title: "The player picks one path", text: "Readers get one tab per path. For real choices, e.g. Safe or Risky." },
  { id: "and", title: "Both at the same time", text: "The hero walks path 1. Units without the hero do path 2, e.g. the Militia clear a camp." },
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
      <p className="text-sm font-medium leading-7 text-fg">Split the route {after}</p>
      <fieldset className="mt-1">
        <legend className="text-[0.8rem] text-muted">What happens here?</legend>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
          {MODES.map((m) => (
            <label
              key={m.id}
              className="flex cursor-pointer items-start gap-2.5 rounded border border-line p-2.5 hover:border-gold/40 has-[:checked]:border-gold/60 has-[:checked]:bg-gold/10"
            >
              <input
                type="radio"
                name={`${id}-mode`}
                value={m.id}
                checked={setup.mode === m.id}
                onChange={() => onChange({ ...setup, mode: m.id })}
                className="mt-1 accent-[var(--wg-gold)]"
              />
              <span>
                <span className="block text-sm font-medium text-fg">{m.title}</span>
                <span className="mt-0.5 block text-[0.78rem] leading-snug text-muted">{m.text}</span>
              </span>
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
          <p className="text-[0.7rem] text-faint">
            Readers pick a tab by this name.
            {setup.names.length < MAX_PATHS ? (
              <>
                {" "}
                <button
                  type="button"
                  onClick={() => {
                    onChange({ ...setup, names: [...setup.names, ""] });
                    focusTo.current = `[data-path-name="${setup.names.length}"]`;
                  }}
                  data-add-path
                  className="text-gold underline underline-offset-2 hover:text-fg"
                >
                  Add a third path
                </button>
              </>
            ) : null}
          </p>
        </div>
      ) : null}
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
