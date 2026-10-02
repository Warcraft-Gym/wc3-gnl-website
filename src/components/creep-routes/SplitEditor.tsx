"use client";

import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import type { DerivedStop } from "@/lib/creep-routes/derive";
import type { IconRace } from "@/lib/builds/icons";
import type { CampCardTrigger, CreepMap, MapCamp } from "@/lib/creep-routes/types";
import { StopEditor, type ActiveArm } from "./StopEditor";
import type { StopRowData } from "./StopRow";
import { updateArm } from "./stop-rows";
import { cn } from "@/lib/utils";

const MODES = [
  { id: "xor", label: "Choose a path" },
  { id: "or", label: "Choose a path, then continue" },
  { id: "and", label: "At the same time" },
] as const;

/**
 * A split in the route being authored: its mode chips, then 2 or 3 ways
 * stacked, each with its own stop list (`StopEditor` at depth 1, which adds no
 * split). "Choose a path" modes give each path a "When…" label; "At the same
 * time" takes none, and stops added to its ways 2.. arrive with the hero off
 * (`RouteEditor`). The dot on a way is a toggle, "Add stops here": camps and
 * places clicked on the map go into it. Nothing may follow a "Choose a path"
 * split, and the row says so when it is not the last stop.
 */
export function SplitEditor({
  row,
  number,
  map,
  setStops,
  iconRace,
  heroIcon,
  fieldError,
  errorPath,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  removeButtonRef,
  armLabels,
  derived,
  onOpenCard,
  openCampId,
  start,
  activeArm,
  onActiveArm,
  last,
}: {
  row: StopRowData & { split: NonNullable<StopRowData["split"]> };
  number: string;
  map: CreepMap;
  /** The top-level rows' setter; a way's stops are updated inside it. */
  setStops: React.Dispatch<React.SetStateAction<StopRowData[]>>;
  iconRace?: IconRace;
  heroIcon?: string;
  fieldError?: (key: string) => string | undefined;
  /** "stops.2.split": where this split's field errors live. */
  errorPath: string;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  removeButtonRef?: (el: HTMLButtonElement | null) => void;
  /** Each way's stop numbers ("3a", "4a"). */
  armLabels: string[][];
  /** This split's derived stop: each way's stops with their kill traces. */
  derived?: DerivedStop;
  onOpenCard?: (camp: MapCamp, el: CampCardTrigger) => void;
  openCampId?: string | null;
  start: number;
  activeArm: ActiveArm;
  onActiveArm?: (arm: ActiveArm) => void;
  /** The split is the route's last stop; an either/or split must be. */
  last: boolean;
}) {
  const { mode, arms } = row.split;
  const choose = mode !== "and";
  const setSplit = (split: Partial<typeof row.split>) =>
    setStops((rows) => rows.map((r) => (r.id === row.id && r.split ? { ...r, split: { ...r.split, ...split } } : r)));
  const removeArm = (a: number) => {
    setSplit({ arms: arms.filter((_, i) => i !== a) });
    if (activeArm?.splitId === row.id) onActiveArm?.(null);
  };
  const armError = (a: number, k: string) => fieldError?.(`${errorPath}.arms.${a}.${k}`);

  return (
    <li className="relative rounded border border-arcane/40 bg-bg/40 p-3">
      <div className="grid grid-cols-[1.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 sm:grid-cols-[1.5rem_minmax(0,1fr)_auto]">
        <span className="tnum pt-2.5 text-center text-xs text-faint">{number}</span>
        <div role="group" aria-label="Split mode" className="flex flex-wrap gap-1.5 pt-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={mode === m.id}
              onClick={() => setSplit({ mode: m.id })}
              className={cn(
                "h-8 rounded border border-arcane/40 px-2.5 text-[0.75rem]",
                mode === m.id ? "bg-arcane/10 text-fg" : "text-arcane hover:bg-arcane/5",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
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
            aria-label="Remove split"
            className="grid size-10 place-items-center rounded border border-line text-muted hover:border-loss/60 hover:text-loss"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-2.5">
        {arms.map((arm, a) => {
          const active = activeArm?.splitId === row.id && activeArm.arm === a;
          return (
            <div key={arm.id} className={cn("rounded border p-2.5", active ? "border-gold/60" : "border-line/70")}>
              <div className="mb-2 flex items-center gap-2">
                <button
                  type="button"
                  aria-pressed={active}
                  aria-label="Add stops here"
                  title="Map clicks add stops to this path"
                  onClick={() => onActiveArm?.(active ? null : { splitId: row.id, arm: a })}
                  className="grid size-6 shrink-0 place-items-center rounded-full border border-line hover:border-gold/60"
                >
                  <span className={cn("size-2.5 rounded-full", active ? "bg-gold" : "bg-transparent")} />
                </button>
                {choose ? (
                  <input
                    aria-label={`Path ${a + 1}`}
                    placeholder="When…"
                    value={arm.label}
                    onChange={(e) => setSplit({ arms: arms.map((x, i) => (i === a ? { ...x, label: e.target.value } : x)) })}
                    maxLength={60}
                    className={cn(
                      "h-9 min-w-0 flex-1 rounded border border-line bg-surface/60 px-3 text-sm text-fg placeholder:text-faint focus:border-gold/60 focus:outline-none",
                      armError(a, "label") && "border-loss",
                    )}
                  />
                ) : (
                  <p className="min-w-0 flex-1 text-xs text-muted">Path {a + 1}</p>
                )}
                {arms.length > 2 ? (
                  <button type="button" onClick={() => removeArm(a)} aria-label={`Remove path ${a + 1}`} className="grid size-9 shrink-0 place-items-center text-faint hover:text-loss">
                    <X size={16} />
                  </button>
                ) : null}
              </div>
              {armError(a, "label") || armError(a, "stops") ? (
                <p className="mb-2 text-[0.65rem] text-loss">{armError(a, "label") ?? armError(a, "stops")}</p>
              ) : null}
              <StopEditor
                depth={1}
                map={map}
                stops={arm.stops}
                setStops={(action) =>
                  setStops((rows) => updateArm(rows, row.id, a, (prev) => (typeof action === "function" ? action(prev) : action)))
                }
                iconRace={iconRace}
                heroIcon={heroIcon}
                fieldError={fieldError}
                errorPath={`${errorPath}.arms.${a}.stops`}
                labels={armLabels[a]}
                derivedStops={derived?.split?.arms[a]?.stops}
                onOpenCard={onOpenCard}
                openCampId={openCampId}
                start={start}
              />
            </div>
          );
        })}
        {arms.length < 3 ? (
          <button
            type="button"
            onClick={() => setSplit({ arms: [...arms, { id: Date.now() + Math.random(), label: "", stops: [] }] })}
            className="inline-flex h-8 items-center gap-1 rounded border border-dashed border-line px-2 text-[0.65rem] font-bold uppercase tracking-wide text-muted hover:border-gold/50 hover:text-gold"
          >
            <Plus size={14} /> Add a path
          </button>
        ) : null}
        {mode === "xor" && !last ? (
          <p className="text-[0.7rem] text-loss">Nothing follows an either/or split: move the stops after it into a path, or choose &quot;Choose a path, then continue&quot;.</p>
        ) : null}
        {fieldError?.(errorPath) ? <p className="text-[0.7rem] text-loss">{fieldError(errorPath)}</p> : null}
      </div>
    </li>
  );
}
