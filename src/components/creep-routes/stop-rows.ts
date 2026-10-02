import type { ExchangeCreepRoute } from "@/lib/creep-routes/exchange";
import type { StopInput } from "@/lib/creep-routes/submission";
import type { StopRowData } from "./StopEditBody";
import * as editorRows from "@/lib/creep-routes/editor-rows.mjs";

/** A fresh editor row; `patch` sets the camp, the place or the split. */
export const newRow = editorRows.newRow as (patch?: Partial<StopRowData>) => StopRowData;

/** An editor row as a submitted stop: the shape of the form's `stopsJson`, the map's route and `deriveRoute`'s input. */
export function rowToStop(s: StopRowData): StopInput {
  if (s.split) {
    const { mode, arms } = s.split;
    return {
      campId: null,
      split: { mode, arms: arms.map((arm) => ({ ...(mode !== "and" ? { label: arm.label.trim() } : {}), stops: arm.stops.map(rowToStop) })) },
    };
  }
  return {
    campId: s.campId,
    action: s.action || undefined,
    units: s.units.filter((u) => u.icon).map((u) => ({ icon: u.icon, count: Number(u.count) || 1 })),
    note: s.note || undefined,
    condition: s.condition || undefined,
    kills: s.campId && s.kills.length ? s.kills : undefined,
    leaveRest: s.campId && s.kills.length && s.leaveRest ? true : undefined,
    place: s.place,
    hero: s.hero === false && (s.campId || s.place?.kind === "attack") ? false : undefined,
  };
}

type ExchangeStop = ExchangeCreepRoute["stops"][number];

/** An imported (`#route=`) stop as an editor row, split ways included. */
export function stopToRow(s: ExchangeStop | Omit<ExchangeStop, "split">): StopRowData {
  if ("split" in s && s.split) {
    return newRow({
      split: {
        mode: s.split.mode,
        arms: s.split.arms.map((arm) => ({ id: Date.now() + Math.random(), label: arm.label ?? "", stops: arm.stops.map(stopToRow) })),
      },
    });
  }
  return newRow({
    campId: s.campId,
    action: s.action ?? "",
    units: (s.units ?? []).map((u) => ({ id: Date.now() + Math.random(), icon: u.icon, count: String(u.count) })),
    note: s.note ?? "",
    condition: s.condition ?? "",
    kills: s.kills ?? [],
    leaveRest: Boolean(s.leaveRest),
    place: s.place,
    hero: s.hero,
  });
}

/** The split mode chips in order; the first is a new split's mode. */
export const SPLIT_MODES = editorRows.SPLIT_MODES as { id: "and" | "or" | "xor"; label: string }[];
/** A new split row: two empty paths, "Choose a path". */
export const newSplitRow = editorRows.newSplitRow as () => StopRowData;

/** Adds a camp stop, or removes it when the list already has it (the map's click toggle). */
export const toggleCamp = editorRows.toggleCamp as (rows: StopRowData[], campId: string) => StopRowData[];

/** A map click with no way active: removes the camp from the split way that holds it, else toggles it at the top level. */
export const toggleCampAnywhere = editorRows.toggleCampAnywhere as (rows: StopRowData[], campId: string) => StopRowData[];

/** Applies `update` to the stops of arm `arm` of the split row `splitId`. */
export const updateArm = editorRows.updateArm as (
  rows: StopRowData[],
  splitId: number,
  arm: number,
  update: (stops: StopRowData[]) => StopRowData[],
) => StopRowData[];

/** The stop-list key of row `id` ("2", "2.a.0"), or null. */
export const keyOfRow = editorRows.keyOfRow as (rows: StopRowData[], id: number) => string | null;
/** The row at a stop-list key. */
export const rowAtKey = editorRows.rowAtKey as (rows: StopRowData[], key: string) => StopRowData | undefined;
/** Merges `patch` into row `id`, at the top level or in a path. */
export const patchRow = editorRows.patchRow as (rows: StopRowData[], id: number, patch: Partial<StopRowData>) => StopRowData[];
/** Removes row `id`, at the top level or in a path. */
export const removeRow = editorRows.removeRow as (rows: StopRowData[], id: number) => StopRowData[];
/** Moves row `id` one place inside its own list. */
export const moveRow = editorRows.moveRow as (rows: StopRowData[], id: number, dir: -1 | 1) => StopRowData[];
/** Where row `id` sits in its own list. */
export const placeInList = editorRows.placeInList as (rows: StopRowData[], id: number) => { index: number; length: number };
