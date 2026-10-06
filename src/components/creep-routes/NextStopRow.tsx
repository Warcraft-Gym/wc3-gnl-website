"use client";

import { Flag, MapPin, Plus, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const BUTTON = "inline-flex h-8 items-center gap-1.5 rounded border px-2.5 text-xs font-medium aria-disabled:opacity-40";
export const GOLD_BUTTON = cn(BUTTON, "border-gold/50 text-gold hover:bg-gold/10");
export const QUIET_BUTTON = cn(BUTTON, "border-line text-muted hover:text-fg");
/** The dashed gold box of the next-stop row and the split form. */
export const SLOT_BOX = "rounded border border-dashed border-gold/60 bg-gold/[0.04] p-3";

/**
 * The builder's add line (`RouteEditor`): a slim row at the target, where the
 * next map click lands (`targetPlace`), with the number that stop will take in a
 * dashed circle (`nextStop`). No box and no buttons: "Waypoint" and "Two paths"
 * sit in the list header. While the map is armed for a waypoint on the route or
 * a pin the line asks for its spot.
 */
export function NextStopRow({
  label,
  armed,
  capLine,
  onCancel,
}: {
  label: string;
  /** A waypoint on the route or a pin waits for its spot on the map. */
  armed: WayType | null;
  capLine?: string | null;
  onCancel: () => void;
}) {
  return (
    <div className="flex min-h-7 items-center gap-3">
      <span
        aria-hidden
        data-add-label
        className="tnum grid size-[26px] shrink-0 place-items-center rounded-full border-[1.5px] border-dashed border-gold text-[0.75rem] font-bold text-gold"
      >
        {armed === "pin" ? <Flag size={14} /> : armed ? <MapPin size={14} /> : label}
      </span>
      <div aria-live="polite" className="min-w-0 flex-1 text-sm text-muted">
        {armed ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-0.5">
            <p>
              <span className="font-medium text-fg">{armed === "pin" ? "Click the spot to pin" : "Click the place on the map"}</span>{" "}
              {armed === "pin" ? "Any spot. The line skips it." : "Bases, gold mines and shops snap to their spot."}
            </p>
            <button type="button" onClick={onCancel} data-focus="cancel" className={QUIET_BUTTON}>
              Cancel
            </button>
          </div>
        ) : (
          <p>
            <span className="lg:hidden">Tap a camp on the map above</span>
            <span className="hidden lg:inline">Click a camp on the map</span>
          </p>
        )}
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

/** A kind of paths block as a mini line: one path dashed (choose one) or both solid (take all). */
export function KindLine({ mode, className }: { mode: string; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 34 10" className={cn("h-2.5 w-[34px] shrink-0", className)} fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M1 5 H8 L14 1 H22 L28 5 H33" />
      <path d="M8 5 L14 9 H22 L28 5" strokeDasharray={mode === "and" ? undefined : "2 2"} />
    </svg>
  );
}
