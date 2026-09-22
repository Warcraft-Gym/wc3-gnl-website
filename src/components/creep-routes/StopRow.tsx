"use client";

import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { IconPicker } from "@/components/builds/IconPicker";
import type { IconRace } from "@/lib/builds/icons";
import type { MapCamp } from "@/lib/creep-routes/types";
import { BandDot } from "./RouteBadges";
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
};

const input =
  "h-10 w-full rounded border border-line bg-surface/60 px-3 text-sm text-fg placeholder:text-faint focus:border-gold/60 focus:outline-none";

function campSummary(camp: MapCamp): string {
  return camp.creeps.map((c) => `${c.count}× ${c.name}`).join(", ");
}

/**
 * One stop in the route being authored: its camp (or base action), what to
 * bring, a note and an optional condition, plus reorder/remove. No time
 * dimension — a route is an ordered list of stops, nothing more. Mirrors
 * `BuildSubmitForm`'s step row layout so the two editors feel like one
 * family.
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
}) {
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
      <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2">
        <span className="tnum pt-2.5 text-center text-xs text-faint">{index + 1}</span>

        {/* Camp / base action */}
        <div className="min-w-0">
          {stop.campId ? (
            <div className="flex h-10 items-center gap-2 rounded border border-line/70 bg-surface/40 px-3 text-sm">
              {camp ? <BandDot band={camp.band} /> : null}
              <span className="font-bold text-fg">{`Camp ${stop.campId}`}</span>
              {camp ? <span className="truncate text-xs text-faint">{campSummary(camp)}</span> : null}
            </div>
          ) : (
            <>
              <input
                aria-label="Base action"
                placeholder='Base action, e.g. "TP home"'
                value={stop.action}
                onChange={(e) => onChange({ action: e.target.value })}
                maxLength={60}
                className={cn(input, error?.("action") && "border-loss")}
              />
              {error?.("action") ? <p className="mt-1 text-[0.65rem] text-loss">{error("action")}</p> : null}
            </>
          )}
        </div>

        {/* Reorder / remove */}
        <div className="flex justify-end gap-1">
          <button type="button" onClick={onMoveUp} disabled={!canMoveUp} aria-label="Move up" className="grid size-10 place-items-center rounded border border-line text-muted hover:text-gold disabled:opacity-30">
            <ArrowUp size={14} />
          </button>
          <button type="button" onClick={onMoveDown} disabled={!canMoveDown} aria-label="Move down" className="grid size-10 place-items-center rounded border border-line text-muted hover:text-gold disabled:opacity-30">
            <ArrowDown size={14} />
          </button>
          <button type="button" onClick={onRemove} aria-label="Remove stop" className="grid size-10 place-items-center rounded border border-line text-muted hover:border-loss/60 hover:text-loss">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Bring */}
        <div>
          <p className="mb-1 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-faint">Bring</p>
          <div className="flex flex-wrap items-center gap-1.5">
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
                  <X size={12} />
                </button>
              </span>
            ))}
            {stop.units.length < 6 ? (
              <button
                type="button"
                onClick={addUnit}
                className="inline-flex h-8 items-center gap-1 rounded border border-dashed border-line px-2 text-[0.65rem] font-bold uppercase tracking-wide text-muted hover:border-gold/50 hover:text-gold"
              >
                <Plus size={12} /> Add
              </button>
            ) : null}
          </div>
        </div>

        {/* Note + condition */}
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div>
            <input
              aria-label="Note"
              placeholder="Note (optional)"
              value={stop.note}
              onChange={(e) => onChange({ note: e.target.value })}
              maxLength={160}
              className={input}
            />
          </div>
          <div>
            <input
              aria-label="Condition"
              placeholder='Condition, e.g. "if harassed"'
              value={stop.condition}
              onChange={(e) => onChange({ condition: e.target.value })}
              maxLength={60}
              className={input}
            />
          </div>
        </div>
      </div>
    </li>
  );
}
