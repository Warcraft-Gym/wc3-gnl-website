"use client";

import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { HeroTile } from "./HeroTile";
import { IconPicker } from "@/components/builds/IconPicker";
import type { IconRace } from "@/lib/builds/icons";
import type { MapCamp, Place, PlaceKind, StopKill } from "@/lib/creep-routes/types";
import { PLACE_KINDS } from "@/lib/creep-routes/place.mjs";
import type { DerivedKill } from "@/lib/creep-routes/derive";
import { STOP_NOTE_MAX, STOP_CONDITION_MAX } from "@/lib/creep-routes/submission.mjs";
import { KillOrderField } from "./KillOrderField";
import { cn } from "@/lib/utils";

export type UnitRow = { id: number; icon: string; count: string };
export type StopRowData = {
  id: number;
  /** null is a base action; `action` names it. */
  campId: string | null;
  action: string;
  units: UnitRow[];
  note: string;
  condition: string;
  /** Ordered kill prefix; empty means the whole camp. See `kills.mjs`. */
  kills: StopKill[];
  /** True leaves the creeps `kills` does not list alive. */
  leaveRest: boolean;
  /** A place stop (`campId` null); `action` says what happens there. */
  place?: Place;
  /** Camp and attack stops: false when only the Bring units go. */
  hero?: boolean;
  /** A split: its mode and paths, each with its own stop rows; `label` is unused in "and". */
  split?: { mode: "and" | "or" | "xor"; arms: { id: number; label: string; stops: StopRowData[] }[] };
};

const input =
  "h-10 w-full rounded border border-line bg-surface/60 px-3 text-sm text-fg placeholder:text-faint focus:border-gold/60 focus:outline-none";

/** Same surface as `input`, but height-less and vertically resizable — a
 *  note is prose, so it wraps instead of scrolling sideways in a one-line
 *  box. Three rows by default, which fits a typical note without pushing
 *  the rest of the stop off screen. */
const textarea =
  "w-full resize-y rounded border border-line bg-surface/60 px-3 py-2 text-sm leading-relaxed text-fg placeholder:text-faint focus:border-gold/60 focus:outline-none";

/** The Note field, plus its "what does this do" hint. Shared by the camp
 *  and base-action layouts below — a base-action row has no Bring/Condition
 *  (F009: those make no sense for "TP home"), but every stop gets a note. */
function NoteField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const remaining = STOP_NOTE_MAX - value.length;
  return (
    <div>
      <textarea
        aria-label="Note"
        placeholder="Note (optional)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={STOP_NOTE_MAX}
        rows={3}
        className={textarea}
      />
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <p className="text-[0.65rem] text-faint">What to do at this camp and why</p>
        {/* Only once it is actually close, so the hint doesn't nag. */}
        {remaining <= 100 ? (
          <p className={cn("tnum text-[0.65rem]", remaining === 0 ? "text-loss" : "text-faint")}>
            {remaining} left
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The editor inside the builder's open stop (`RouteEditor`): the reader's
 * `StopBlock` draws the summary line (number, band dot, camp or place name,
 * level), this replaces its body. A place stop gets its kind and "What
 * happens here"; a base action its action text; a camp or attack stop the
 * Bring row with the hero entry; a camp the kill order picker; every stop a
 * condition and a note; then move and remove.
 */
export function StopEditBody({
  stop,
  camp,
  iconRace,
  error,
  onChange,
  onRemove,
  onMove,
  canMoveUp,
  canMoveDown,
  trace,
  absent,
  heroIcon,
}: {
  stop: StopRowData;
  /** The resolved camp for a camp stop; undefined for a place or a base action. */
  camp?: MapCamp;
  iconRace?: IconRace;
  error?: (key: string) => string | undefined;
  onChange: (patch: Partial<StopRowData>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** This stop's `deriveRoute` kill trace, for the kill order chain. */
  trace?: DerivedKill[];
  /** Derived hero off: its own flag, or a later path of an "and" split. */
  absent?: boolean;
  /** The route's hero icon for the Bring hero entry; the "Any Hero" crown tile when the route names none. */
  heroIcon?: string;
}) {
  const heroOff = Boolean(absent ?? stop.hero === false);
  // A later path of an "and" split: the hero walks path a, so this stop cannot take him.
  const forcedOff = heroOff && stop.hero !== false;
  function addUnit() {
    if (stop.units.length >= 6) return;
    onChange({ units: [...stop.units, { id: Date.now() + Math.random(), icon: "", count: "1" }] });
  }
  function updateUnit(id: number, patch: Partial<UnitRow>) {
    onChange({ units: stop.units.map((u) => (u.id === id ? { ...u, ...patch } : u)) });
  }
  function removeUnit(id: number) {
    onChange({ units: stop.units.filter((u) => u.id !== id) });
  }
  const iconButton = "grid size-9 place-items-center rounded border border-line text-muted hover:text-gold disabled:opacity-30";

  return (
    <div className="min-w-0 space-y-3">
      {stop.place ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-[0.6rem] font-bold uppercase tracking-[0.14em] text-faint">What happens here</span>
            <input
              placeholder="e.g. Harass their base, Buy circlet"
              value={stop.action}
              onChange={(e) => onChange({ action: e.target.value })}
              maxLength={60}
              className={cn(input, error?.("action") && "border-loss")}
            />
          </label>
          {/* The click picked a kind; any of them can be changed here. */}
          <select
            aria-label="Kind"
            value={stop.place.kind}
            onChange={(e) => stop.place && onChange({ place: { ...stop.place, kind: e.target.value as PlaceKind } })}
            className="h-10 shrink-0 rounded border border-line bg-surface/60 px-2 text-sm text-fg focus:border-gold/60 focus:outline-none"
          >
            {(PLACE_KINDS as PlaceKind[]).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          {error?.("action") ? <p className="basis-full text-[0.65rem] text-loss">{error("action")}</p> : null}
        </div>
      ) : !stop.campId ? (
        <div>
          <input
            aria-label="Waypoint"
            placeholder="e.g. TP home, buy a Rod of Necromancy"
            value={stop.action}
            onChange={(e) => onChange({ action: e.target.value })}
            maxLength={60}
            className={cn(input, error?.("action") && "border-loss")}
          />
          <p className="mt-1 text-[0.65rem] text-faint">{error?.("action") ?? "Click the map to put it on a spot, or keep it as an action without one."}</p>
        </div>
      ) : null}

      {stop.campId || stop.place ? (
        <div>
          <p className="mb-1 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-faint">Bring</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {/* The hero is the first entry on a camp or place stop: on by default, off = only the units go
             *  (a waypoint done by another unit is not on the reader's map). */}
            {stop.campId || stop.place ? (
              <button
                type="button"
                aria-pressed={!heroOff}
                disabled={forcedOff}
                onClick={() => onChange({ hero: stop.hero === false ? undefined : false })}
                title={forcedOff ? "The hero walks the first path" : heroOff ? "Add the hero" : "Send only the units"}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded border py-1 pl-1 pr-2 text-xs",
                  heroOff ? "border-dashed border-line text-faint line-through" : "border-gold/50 text-fg",
                  forcedOff && "cursor-not-allowed",
                )}
              >
                <HeroTile heroIcon={heroIcon} size={24} className={cn(heroOff && "opacity-40 grayscale")} />
                {heroIcon ? "Hero" : "Any Hero"}
              </button>
            ) : null}
            {stop.units.map((u) => (
              <span key={u.id} className="flex items-center gap-1 rounded border border-line/70 bg-surface/40 py-1 pl-1 pr-1.5">
                <IconPicker value={u.icon} onChange={(k) => updateUnit(u.id, { icon: k })} race={iconRace} />
                <input
                  aria-label="Count"
                  inputMode="numeric"
                  value={u.count}
                  onChange={(e) => updateUnit(u.id, { count: e.target.value.replace(/\D/g, "").slice(0, 2) })}
                  className="tnum h-7 w-9 rounded border border-line bg-surface/60 px-1 text-center text-xs text-fg focus:border-gold/60 focus:outline-none"
                />
                <button type="button" onClick={() => removeUnit(u.id)} aria-label="Remove" className="text-faint hover:text-loss">
                  <X size={14} />
                </button>
              </span>
            ))}
            {stop.units.length < 6 ? (
              <button
                type="button"
                onClick={addUnit}
                className="inline-flex h-8 items-center gap-1 rounded border border-dashed border-line px-2 text-[0.65rem] font-bold uppercase tracking-wide text-muted hover:border-gold/50 hover:text-gold"
              >
                <Plus size={14} /> Add
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {camp ? (
        <KillOrderField camp={camp} kills={stop.kills} leaveRest={stop.leaveRest} trace={trace ?? []} error={error?.("kills")} onChange={onChange} />
      ) : null}

      {stop.campId || stop.place ? (
        <div>
          <input
            aria-label="Condition"
            placeholder='Condition, e.g. "Only if harassed"'
            value={stop.condition}
            onChange={(e) => onChange({ condition: e.target.value })}
            maxLength={STOP_CONDITION_MAX}
            className={input}
          />
          <p className="mt-1 text-[0.65rem] text-faint">Shown as written, above the note: write the whole phrase, e.g. Only if harassed</p>
        </div>
      ) : null}

      <NoteField value={stop.note} onChange={(v) => onChange({ note: v })} />

      <div className="flex items-center gap-1">
        <p className="mr-auto text-[0.65rem] text-faint">A coach can add pictures in the Studio after review</p>
        <button type="button" onClick={() => onMove(-1)} disabled={!canMoveUp} aria-label="Move up" className={iconButton}>
          <ArrowUp size={16} />
        </button>
        <button type="button" onClick={() => onMove(1)} disabled={!canMoveDown} aria-label="Move down" className={iconButton}>
          <ArrowDown size={16} />
        </button>
        <button type="button" onClick={onRemove} aria-label="Remove stop" className={cn(iconButton, "hover:border-loss/60 hover:text-loss")}>
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
