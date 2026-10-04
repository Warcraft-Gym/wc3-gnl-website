"use client";

import { useEffect, useRef } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { HeroTile } from "./HeroTile";
import { WAY_TYPES, type WayType } from "./NextStopRow";
import { PlaceIcon } from "./PlaceGlyph";
import { IconPicker } from "@/components/builds/IconPicker";
import type { IconRace } from "@/lib/builds/icons";
import type { MapCamp, Place, PlaceKind, StopKill } from "@/lib/creep-routes/types";
import { isPin } from "@/lib/creep-routes/place.mjs";
import type { DerivedKill } from "@/lib/creep-routes/derive";
import { STOP_NOTE_MAX, STOP_CONDITION_MAX } from "@/lib/creep-routes/submission.mjs";
import { newId } from "@/lib/creep-routes/editor-rows.mjs";
import { KillOrderField } from "./KillOrderField";
import { cn } from "@/lib/utils";

export type UnitRow = { id: number; icon: string; count: string };
export type StopRowData = {
  id: number;
  /** The published stop's `_key` on an update: the server copies that stop's pictures. */
  key?: string;
  /** How many pictures the published stop has; they stay with the stop. */
  pictures?: number;
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
  /** Camp and attack stops: false when only the Bring units go. On a waypoint, false makes it a pin (`isPin`). */
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
 *  (F009: those make no sense for "TP home"), but every stop gets a note.
 *  A camp stop (`camp`) keeps the hint in the placeholder. */
function NoteField({ value, onChange, camp }: { value: string; onChange: (v: string) => void; camp?: boolean }) {
  const remaining = STOP_NOTE_MAX - value.length;
  return (
    <div>
      <textarea
        aria-label="Note"
        placeholder={camp ? "What to do here and why (optional)" : "Note (optional)"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={STOP_NOTE_MAX}
        rows={3}
        className={textarea}
      />
      <div className="mt-1 flex items-baseline justify-between gap-3 empty:hidden">
        {camp ? null : <p className="text-[0.65rem] text-faint">What to do at this camp and why</p>}
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

/** A place step's kinds in button order, each with its text field's placeholder. */
const KINDS: { id: PlaceKind; label: string; hint: string }[] = [
  { id: "shop", label: "Shop", hint: "e.g. Buy Boots and Dust" },
  { id: "expand", label: "Expand", hint: "e.g. Take the natural expansion" },
  { id: "build", label: "Build", hint: "e.g. Build a second Altar" },
  { id: "scout", label: "Scout", hint: "e.g. Scout their hero" },
  { id: "attack", label: "Attack", hint: "e.g. Harass their workers" },
];

const iconButton = "grid size-9 shrink-0 place-items-center rounded border border-line text-muted hover:text-gold disabled:opacity-30";
const addButton =
  "inline-flex h-8 items-center gap-1 rounded border border-dashed border-line px-2.5 text-xs text-muted hover:border-gold/50 hover:text-gold";

/** Move up, move down and remove, on the open stop's summary row (`StopBlock`'s `tools`). The arrows'
 *  names say when a move enters or leaves a split ("Move into path 2"); `data-move` lets the builder
 *  put focus back on an arrow after the move. */
export function StopTools({
  onMove,
  onRemove,
  canMoveUp,
  canMoveDown,
  upLabel = "Move up",
  downLabel = "Move down",
}: {
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  upLabel?: string;
  downLabel?: string;
}) {
  return (
    <span className="relative flex flex-col gap-1 sm:-my-1 sm:flex-row">
      <button type="button" onClick={() => onMove(-1)} disabled={!canMoveUp} aria-label={upLabel} title={upLabel} data-move="-1" className={iconButton}>
        <ArrowUp size={16} />
      </button>
      <button type="button" onClick={() => onMove(1)} disabled={!canMoveDown} aria-label={downLabel} title={downLabel} data-move="1" className={iconButton}>
        <ArrowDown size={16} />
      </button>
      <button type="button" onClick={onRemove} aria-label="Remove stop" title="Remove stop" className={cn(iconButton, "hover:border-loss/60 hover:text-loss")}>
        <Trash2 size={16} />
      </button>
    </span>
  );
}

/**
 * The editor inside the builder's open stop (`RouteEditor`): the reader's
 * `StopBlock` draws the summary line (number, band dot, camp or place name,
 * level, and `StopTools`), this replaces its body. A camp stop: the kill order
 * picker and the note. Any other step (a waypoint, a pin, an attack or a step with
 * no place): the switch "On the route | Pin | No place", the kind buttons, its text
 * and the note. Then Bring and the condition as dashed add buttons until used (a
 * field with content always shows); the hero is Bring's first entry on a camp or
 * attack stop only.
 */
export function StopEditBody({
  stop,
  camp,
  iconRace,
  error,
  onChange,
  trace,
  absent,
  heroIcon,
  opened = { bring: false, condition: false },
  onOpen = () => {},
  onArm,
}: {
  stop: StopRowData;
  /** The resolved camp for a camp stop; undefined for a place or a base action. */
  camp?: MapCamp;
  iconRace?: IconRace;
  error?: (key: string) => string | undefined;
  onChange: (patch: Partial<StopRowData>) => void;
  /** This stop's `deriveRoute` kill trace, for the kill order chain. */
  trace?: DerivedKill[];
  /** Derived hero off: its own flag, or a later path of an "and" split. */
  absent?: boolean;
  /** The route's hero icon for the Bring hero entry; the "Any Hero" crown tile when the route names none. */
  heroIcon?: string;
  /** A camp stop's Bring and condition, once opened (kept by row id in `RouteEditor`, so a move keeps them). */
  opened?: { bring: boolean; condition: boolean };
  onOpen?: (part: "bring" | "condition") => void;
  /** No place switched to On the route or Pin: the map waits for this step's spot. */
  onArm?: (type: Exclude<WayType, "none">) => void;
}) {
  const isCamp = Boolean(stop.campId);
  // The hero is Bring's first entry on a camp or attack stop; a waypoint has none (a pin is the switch's).
  const heroEntry = Boolean(stop.campId || stop.place?.kind === "attack");
  const heroOff = heroEntry && Boolean(absent ?? stop.hero === false);
  // A later path of an "and" split: the hero walks path a, so this stop cannot take him.
  const forcedOff = heroOff && stop.hero !== false;
  // Bring and the condition show once used: content, a hero-off stop, or a click on the add button.
  // An edit there keeps it open, so removing the last unit never hides the block under focus.
  const showBring = opened.bring || stop.units.length > 0 || heroOff;
  const showCondition = opened.condition || Boolean(stop.condition);
  const type: WayType = !stop.place ? "none" : isPin(stop) ? "pin" : "route";
  // Each switch is one change: No place clears the place (the text stays), from No place the map waits
  // for the spot, between the other two the hero flag flips (an attack made a pin scouts).
  const setType = (to: WayType) => {
    if (to === type) return;
    if (to === "none") return onChange({ place: undefined, hero: undefined });
    if (!stop.place) return onArm?.(to);
    onChange({ place: { ...stop.place, kind: to === "pin" && stop.place.kind === "attack" ? "scout" : stop.place.kind }, hero: to === "pin" ? false : undefined });
  };
  // After "+ Bring units", "+ Condition" or a unit's remove, focus goes to this control in the body.
  const body = useRef<HTMLDivElement>(null);
  const focusTo = useRef<string | null>(null);
  useEffect(() => {
    const q = focusTo.current;
    if (!q) return;
    focusTo.current = null;
    body.current?.querySelector<HTMLElement>(q)?.focus();
  });
  const bringChange = (patch: Partial<StopRowData>) => {
    onOpen("bring");
    onChange(patch);
  };
  function addUnit() {
    if (stop.units.length >= 6) return;
    bringChange({ units: [...stop.units, { id: newId(), icon: "", count: "1" }] });
  }
  function updateUnit(id: number, patch: Partial<UnitRow>) {
    bringChange({ units: stop.units.map((u) => (u.id === id ? { ...u, ...patch } : u)) });
  }
  function removeUnit(id: number) {
    bringChange({ units: stop.units.filter((u) => u.id !== id) });
    focusTo.current = "[data-add-unit]";
  }

  const bring =
    showBring ? (
      <div data-bring>
        <p className="mb-1 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-faint">Bring</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {/* The hero is the first entry on a camp or attack stop: on by default, off = only the units go. */}
          {heroEntry ? (
            <button
              type="button"
              aria-pressed={!heroOff}
              disabled={forcedOff}
              onClick={() => bringChange({ hero: stop.hero === false ? undefined : false })}
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
              data-add-unit
              className="inline-flex h-8 items-center gap-1 rounded border border-dashed border-line px-2 text-[0.65rem] font-bold uppercase tracking-wide text-muted hover:border-gold/50 hover:text-gold"
            >
              <Plus size={14} /> Add
            </button>
          ) : null}
        </div>
      </div>
    ) : null;
  const condition = showCondition ? (
    <input
      aria-label="Condition"
      placeholder="Shown above the note, e.g. Only if harassed"
      value={stop.condition}
      onChange={(e) => {
        onOpen("condition");
        onChange({ condition: e.target.value });
      }}
      maxLength={STOP_CONDITION_MAX}
      className={input}
    />
  ) : null;
  const kind = KINDS.find((k) => k.id === stop.place?.kind);

  return (
    <div ref={body} className="min-w-0 space-y-3">
      {isCamp ? null : (
        <>
          <div role="group" aria-label="Waypoint" className="flex w-fit flex-wrap divide-x divide-line overflow-hidden rounded border border-line">
            {WAY_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={t.id === type}
                title={t.line}
                onClick={() => setType(t.id)}
                className="inline-flex h-8 items-center gap-1.5 px-2.5 text-xs text-muted hover:text-fg aria-pressed:bg-gold/10 aria-pressed:text-fg"
              >
                <t.Glyph aria-hidden size={14} /> {t.short}
              </button>
            ))}
          </div>
          {stop.place ? (
            <div role="group" aria-label="What happens here" className="flex flex-wrap gap-1.5">
              {KINDS.filter((k) => !(type === "pin" && k.id === "attack")).map((k) => (
                <button
                  key={k.id}
                  type="button"
                  aria-pressed={k.id === stop.place?.kind}
                  onClick={() => stop.place && onChange({ place: { ...stop.place, kind: k.id } })}
                  className="inline-flex h-8 items-center gap-1.5 rounded border border-line px-2.5 text-xs text-muted hover:text-fg aria-pressed:border-gold/60 aria-pressed:bg-gold/10 aria-pressed:text-fg"
                >
                  <PlaceIcon kind={k.id} className={k.id === "attack" ? "text-loss" : undefined} /> {k.label}
                </button>
              ))}
            </div>
          ) : null}
          <div>
            <input
              aria-label="What happens"
              placeholder={kind?.hint ?? "e.g. TP home"}
              value={stop.action}
              onChange={(e) => onChange({ action: e.target.value })}
              maxLength={60}
              data-way-text
              className={cn(input, error?.("action") && "border-loss")}
            />
            {error?.("action") ? <p className="mt-1 text-[0.65rem] text-loss">{error("action")}</p> : null}
          </div>
        </>
      )}
      {camp ? (
        <KillOrderField camp={camp} kills={stop.kills} leaveRest={stop.leaveRest} trace={trace ?? []} error={error?.("kills")} onChange={onChange} />
      ) : null}

      <NoteField value={stop.note} onChange={(v) => onChange({ note: v })} camp={isCamp} />

      {bring}
      {condition}
      {showBring && showCondition ? null : (
        <div className="flex flex-wrap gap-1.5">
          {showBring ? null : (
            <button
              type="button"
              onClick={() => {
                onOpen("bring");
                focusTo.current = "[data-bring] button:not(:disabled)";
              }}
              className={addButton}
            >
              <Plus aria-hidden size={13} /> Bring units
            </button>
          )}
          {showCondition ? null : (
            <button
              type="button"
              onClick={() => {
                onOpen("condition");
                focusTo.current = 'input[aria-label="Condition"]';
              }}
              className={addButton}
            >
              <Plus aria-hidden size={13} /> Condition
            </button>
          )}
        </div>
      )}

      {/* A camp stop names its pictures only when it has some. */}
      {isCamp && !stop.pictures ? null : (
        <p className="text-[0.65rem] text-faint">
          {stop.pictures
            ? `${stop.pictures} ${stop.pictures === 1 ? "picture stays" : "pictures stay"} with this stop`
            : "A coach can add pictures in the Studio after review"}
        </p>
      )}
    </div>
  );
}
