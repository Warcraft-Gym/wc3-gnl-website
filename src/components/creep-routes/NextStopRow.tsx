"use client";

import { Crosshair, MapPin, Split } from "lucide-react";
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
              <button type="button" onClick={onCancel} className={QUIET_BUTTON}>
                Cancel
              </button>
            ) : (
              <>
                <button type="button" onClick={onWaypoint} aria-disabled={blocked} className={GOLD_BUTTON}>
                  <MapPin aria-hidden size={14} /> Waypoint
                </button>
                {inPath ? null : (
                  <button type="button" onClick={onSplit} aria-disabled={blocked} className={GOLD_BUTTON}>
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
