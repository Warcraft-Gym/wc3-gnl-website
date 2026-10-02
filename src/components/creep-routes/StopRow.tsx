"use client";

import { ArrowDown, ArrowUp, Info, Plus, Trash2, X } from "lucide-react";
import { HeroTile } from "./HeroTile";
import { IconPicker } from "@/components/builds/IconPicker";
import type { IconRace } from "@/lib/builds/icons";
import type { CampCardTrigger, MapCamp, Place, PlaceKind, StopKill } from "@/lib/creep-routes/types";
import { PLACE_KINDS } from "@/lib/creep-routes/place.mjs";
import { creepsLeft, killedXpShare } from "@/lib/creep-routes/kills.mjs";
import type { DerivedKill } from "@/lib/creep-routes/derive";
import { campLabel } from "@/lib/creep-routes/camp-label.mjs";
import { STOP_NOTE_MAX, STOP_CONDITION_MAX } from "@/lib/creep-routes/submission.mjs";
import { BandDot } from "./RouteBadges";
import { KillOrderField } from "./KillOrderField";
import { PlaceIcon } from "./PlaceGlyph";
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
  /** A fork or parallel node (`ForkRow`): its ways, each with its own stop rows; `label` is unused on a parallel node. */
  fork?: { kind: "fork" | "parallel"; arms: { id: number; label: string; stops: StopRowData[] }[] };
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
 * One stop in the route being authored: its camp (or base action), what to
 * bring, a note and an optional condition, plus reorder/remove. No time
 * dimension — a route is an ordered list of stops, nothing more. Mirrors
 * `BuildSubmitForm`'s step row layout so the two editors feel like one
 * family. A base-action row (`campId: null`) hides Bring and Condition —
 * neither makes sense for "TP home" — and shows only its action text and a
 * note (F009, the ux.md review's item 7).
 */
export function StopRow({
  index,
  stop,
  camp,
  iconRace,
  error,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  removeButtonRef,
  onOpenCard,
  cardOpen,
  trace,
  placeLabel,
  number,
  absent,
  heroIcon,
}: {
  index: number;
  stop: StopRowData;
  /** The resolved camp for a camp stop; undefined for a base action. */
  camp?: MapCamp;
  iconRace?: IconRace;
  error?: (key: string) => string | undefined;
  onChange: (patch: Partial<StopRowData>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** Lets `StopEditor` refocus this exact button after a *different* row
   *  is removed (F009, code-b.md item 4) — see its own doc comment. */
  removeButtonRef?: (el: HTMLButtonElement | null) => void;
  /** Pins the F012 camp card for this stop's camp — the ⓘ button that
   *  replaced the composition line (`campComposition`, F009). Only shown
   *  when `camp` resolved. */
  onOpenCard?: (camp: MapCamp, el: CampCardTrigger) => void;
  /** F012a: whether the card is currently open (pinned or hover-shown) for
   *  this stop's camp — drives the ⓘ button's `aria-expanded` (C-025). */
  cardOpen?: boolean;
  /** This stop's `deriveRoute` kill trace, for the kill order chain. */
  trace?: DerivedKill[];
  /** The place's name ("their base", "Marketplace"), for a place stop. */
  placeLabel?: string;
  /** The stop's number from `stop-numbers.mjs` ("3a" in a fork's way); default `index + 1`. */
  number?: string;
  /** Derived hero off: its own flag, or a later arm of a parallel node. */
  absent?: boolean;
  /** The route's hero icon for the Bring hero entry; the "Any Hero" crown tile when the route names none. */
  heroIcon?: string;
}) {
  const heroOff = Boolean(absent ?? stop.hero === false);
  // A later arm of a parallel node: the hero walks arm 0, so this stop cannot take him.
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

  return (
    <li className="relative rounded border border-line/70 bg-bg/40 p-3">
      <div className="grid grid-cols-[1.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 sm:grid-cols-[1.5rem_minmax(0,1fr)_auto]">
        <span className="tnum pt-2.5 text-center text-xs text-faint">{number ?? index + 1}</span>

        {/* Camp / place / base action */}
        <div className="min-w-0">
          {stop.place ? (
            <div className="flex h-10 items-center gap-2 rounded border border-line/70 bg-surface/40 pl-3 pr-1 text-sm">
              <PlaceIcon kind={stop.place.kind} className={cn("shrink-0", stop.place.kind === "attack" ? "text-loss" : "text-fg")} />
              <span className="truncate font-bold text-fg first-letter:uppercase">{placeLabel}</span>
              {/* The click picked a kind; any of them can be changed here. */}
              <select
                aria-label="Kind"
                value={stop.place.kind}
                onChange={(e) => stop.place && onChange({ place: { ...stop.place, kind: e.target.value as PlaceKind } })}
                className="ml-auto h-8 shrink-0 rounded border border-line bg-surface/60 px-1.5 text-xs text-fg focus:border-gold/60 focus:outline-none"
              >
                {(PLACE_KINDS as PlaceKind[]).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          ) : stop.campId ? (
            <div className="flex h-10 items-center gap-2 rounded border border-line/70 bg-surface/40 px-3 text-sm">
              {camp ? (
                <BandDot band={camp.band} killed={creepsLeft(camp, stop.kills, stop.leaveRest) > 0 ? killedXpShare(camp, stop.kills, stop.leaveRest) : undefined} />
              ) : null}
              <span className="truncate font-bold text-fg">{camp ? campLabel(camp) : stop.campId}</span>
              {camp ? (
                <button
                  type="button"
                  onClick={(e) => onOpenCard?.(camp, e.currentTarget)}
                  aria-label={`What's in ${campLabel(camp)}`}
                  aria-expanded={cardOpen ?? false}
                  title="What's in this camp"
                  className="ml-auto grid size-6 shrink-0 place-items-center rounded text-faint hover:text-gold"
                >
                  <Info size={16} />
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <input
                aria-label="Base action"
                placeholder="e.g. TP home, expand, shop"
                value={stop.action}
                onChange={(e) => onChange({ action: e.target.value })}
                maxLength={60}
                className={cn(input, error?.("action") && "border-loss")}
              />
              {error?.("action") ? <p className="mt-1 text-[0.65rem] text-loss">{error("action")}</p> : null}
            </>
          )}
        </div>

        {/* Reorder / remove: own line under the camp box on a phone */}
        <div className="col-start-2 flex justify-end gap-1 sm:col-start-auto">
          <button type="button" onClick={onMoveUp} disabled={!canMoveUp} aria-label="Move up" className="grid size-10 place-items-center rounded border border-line text-muted hover:text-gold disabled:opacity-30">
            <ArrowUp size={16} />
          </button>
          <button type="button" onClick={onMoveDown} disabled={!canMoveDown} aria-label="Move down" className="grid size-10 place-items-center rounded border border-line text-muted hover:text-gold disabled:opacity-30">
            <ArrowDown size={16} />
          </button>
          <button
            type="button"
            ref={removeButtonRef}
            onClick={onRemove}
            aria-label="Remove stop"
            className="grid size-10 place-items-center rounded border border-line text-muted hover:border-loss/60 hover:text-loss"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {stop.campId || stop.place ? (
        // Stacked, not columned: the note is up to 160 characters and the
        // condition up to 60, so both get the full row rather than a quarter
        // of it (the note used to be half of a half). Bring is a chip row
        // and reads better with the room too.
        <div className="mt-2.5 space-y-2.5">
          {stop.place ? (
            <div>
              <label htmlFor={`stop-${stop.id}-action`} className="mb-1 block text-[0.6rem] font-bold uppercase tracking-[0.14em] text-faint">
                What happens here
              </label>
              <input
                id={`stop-${stop.id}-action`}
                placeholder="e.g. Harass their base, Buy circlet"
                value={stop.action}
                onChange={(e) => onChange({ action: e.target.value })}
                maxLength={60}
                className={cn(input, error?.("action") && "border-loss")}
              />
              {error?.("action") ? <p className="mt-1 text-[0.65rem] text-loss">{error("action")}</p> : null}
            </div>
          ) : null}
          {/* Bring */}
          <div>
            <p className="mb-1 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-faint">Bring</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {/* The hero is the first entry on a camp or attack stop: on by default, off = only the units go. */}
              {stop.campId || stop.place?.kind === "attack" ? (
                <button
                  type="button"
                  aria-pressed={!heroOff}
                  disabled={forcedOff}
                  onClick={() => onChange({ hero: stop.hero === false ? undefined : false })}
                  title={forcedOff ? "The hero walks the first way" : heroOff ? "Add the hero" : "Send only the units"}
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

          {camp ? (
            <KillOrderField
              camp={camp}
              kills={stop.kills}
              leaveRest={stop.leaveRest}
              trace={trace ?? []}
              error={error?.("kills")}
              onChange={onChange}
              noXp={heroOff}
            />
          ) : null}

          {/* Note */}
          <NoteField value={stop.note} onChange={(v) => onChange({ note: v })} />

          {/* Condition */}
          <div>
            <input
              aria-label="Condition"
              placeholder='Condition, e.g. "Only if harassed"'
              value={stop.condition}
              onChange={(e) => onChange({ condition: e.target.value })}
              maxLength={STOP_CONDITION_MAX}
              className={input}
            />
            <p className="mt-1 text-[0.65rem] text-faint">
              Shown as written, above the note — write the whole phrase, e.g. Only if harassed, Skip if they scouted
            </p>
          </div>
        </div>
      ) : (
        // Base action: no Bring, no Condition — neither means anything for
        // "TP home". Just the note.
        <div className="mt-2.5">
          <NoteField value={stop.note} onChange={(v) => onChange({ note: v })} />
        </div>
      )}
    </li>
  );
}
