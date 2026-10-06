"use client";

import { Flag, MapPin, Plus, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const BUTTON = "inline-flex h-8 items-center gap-1.5 rounded border px-2.5 text-xs font-medium aria-disabled:opacity-40";
export const GOLD_BUTTON = cn(BUTTON, "border-gold/50 text-gold hover:bg-gold/10");
export const QUIET_BUTTON = cn(BUTTON, "border-line text-muted hover:text-fg");
const ARMED_BUTTON = "inline-flex h-8 items-center gap-1.5 rounded px-2 text-sm text-fg hover:text-gold aria-disabled:opacity-40";
/** The dashed gold box of the next-stop row and the split form. */
export const SLOT_BOX = "rounded border border-dashed border-gold/60 bg-gold/[0.04] p-3";

/**
 * The builder's add line (`RouteEditor`): a slim row at the target, where the
 * next map click lands (`targetPlace`), with the number that stop will take in a
 * dashed circle (`nextStop`). No box and no buttons: "Waypoint" and "Two paths"
 * sit in the list header.
 */
export function NextStopRow({ label, capLine }: { label: string; capLine?: string | null }) {
  return (
    <div className="flex min-h-7 items-center gap-3">
      <span
        aria-hidden
        data-add-label
        className="tnum grid size-[26px] shrink-0 place-items-center rounded-full border-[1.5px] border-dashed border-gold text-[0.75rem] font-bold text-gold"
      >
        {label}
      </span>
      <div aria-live="polite" className="min-w-0 flex-1 text-sm text-muted">
        <p>
          <span className="lg:hidden">Tap a camp on the map above</span>
          <span className="hidden lg:inline">Click a camp on the map</span>
        </p>
        {capLine ? <p className="mt-1 text-[0.7rem] text-faint">{capLine}</p> : null}
      </div>
    </div>
  );
}

/** The end of a list that is not the target: a quiet text button that makes it the target. */
export function QuietAdd({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-7 items-center gap-1.5 text-left text-sm text-muted hover:text-gold">
      <Plus aria-hidden size={14} /> {children}
    </button>
  );
}

// A waypoint is a step at a place with no creeps. The line goes through it, or it is a pin the line skips.
// A step with no place is an action ("No place"): its text and note, and Bring or a condition only when they hold content.
export type WayType = "route" | "pin";
export const WAY_TYPES = [
  { id: "route", short: "On the route", line: "The line goes through it.", Glyph: MapPin },
  { id: "pin", short: "Pin", line: "Marks a spot. The line skips it.", Glyph: Flag },
] as const;

/**
 * Places mode's bar, under the map: what a click does there, then "No place" (adding a waypoint) and
 * "Cancel". Moving a waypoint (`move`) asks for its new place, with only "Cancel".
 */
export function ArmedBar({ move, noPlaceCap, onNoPlace, onCancel }: { move: boolean; noPlaceCap?: boolean; onNoPlace: () => void; onCancel: () => void }) {
  const say = move ? "the new place for this waypoint" : "a base, gold mine, shop or any spot";
  return (
    <div data-armed-bar className="mt-2 flex min-h-10 flex-wrap items-center gap-x-2.5 gap-y-1 rounded border border-gold bg-gold/10 py-1 pl-3 pr-1.5 text-[0.86rem] text-fg">
      <span role="status" className="mr-auto">
        <span className="lg:hidden">Tap {say}</span>
        <span className="hidden lg:inline">Click {say}</span>
      </span>
      {move ? null : (
        <button type="button" onClick={onNoPlace} aria-disabled={noPlaceCap || undefined} className={ARMED_BUTTON}>
          <Zap aria-hidden size={14} /> No place
        </button>
      )}
      <button type="button" onClick={onCancel} className={ARMED_BUTTON}>
        Cancel
      </button>
    </div>
  );
}

/** A kind of paths block as a mini line: one path dashed (choose one) or both solid (take all). */
export function KindLine({ mode, className }: { mode: string; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 34 10" className={cn("h-2.5 w-[34px] shrink-0", className)} fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M1 5 H8 L14 1 H22 L28 5 H33" />
      <path d="M8 5 L14 9 H22 L28 5" strokeDasharray={mode === "and" ? undefined : "2 2"} />
    </svg>
  );
}
