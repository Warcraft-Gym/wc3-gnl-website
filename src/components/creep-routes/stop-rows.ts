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
    key: s.key,
    campId: s.campId,
    action: s.action || undefined,
    units: s.units.filter((u) => u.icon).map((u) => ({ icon: u.icon, count: Number(u.count) || 1 })),
    note: s.note || undefined,
    condition: s.condition || undefined,
    kills: s.campId && s.kills.length ? s.kills : undefined,
    leaveRest: s.campId && s.kills.length && s.leaveRest ? true : undefined,
    place: s.place,
    hero: s.hero === false && (s.campId || s.place) ? false : undefined,
  };
}

type ExchangeStop = ExchangeCreepRoute["stops"][number];

/** An imported (`#route=`) stop as an editor row, split ways included. */
export function stopToRow(s: ExchangeStop | Omit<ExchangeStop, "split">): StopRowData {
  if ("split" in s && s.split) {
    return newRow({
      split: {
        mode: s.split.mode,
        arms: s.split.arms.map((arm) => ({ id: editorRows.newId(), label: arm.label ?? "", stops: arm.stops.map(stopToRow) })),
      },
    });
  }
  return newRow({
    key: s.key,
    pictures: s.pictures,
    campId: s.campId,
    action: s.action ?? "",
    units: (s.units ?? []).map((u) => ({ id: editorRows.newId(), icon: u.icon, count: String(u.count) })),
    note: s.note ?? "",
    condition: s.condition ?? "",
    kills: s.kills ?? [],
    leaveRest: Boolean(s.leaveRest),
    place: s.place,
    hero: s.hero,
  });
}

/** A new split row: empty paths with these labels (two by default), "Choose one path" by default. */
export const newSplitRow = editorRows.newSplitRow as (mode?: "and" | "or", labels?: string[]) => StopRowData;

/** The editor rows as submitted stops, each split's or/xor read from the structure (stops after it: or). */
export function rowsToStops(rows: StopRowData[]): StopInput[] {
  return editorRows.withSavedModes(rows.map(rowToStop)) as StopInput[];
}

/** A place in the list: `{ index }` at the top level, `{ splitId, arm, index }` in a path. */
export type ListPlace = { index: number; splitId?: number; arm?: number };
/** Where row `id` sits; null when absent. */
export const locate = editorRows.locate as (rows: StopRowData[], id: number) => ListPlace | null;
/** The list a place names. */
export const listAt = editorRows.listAt as (rows: StopRowData[], at: ListPlace) => StopRowData[];
/** Inserts a row at a place; a split only at the top level. */
export const insertAt = editorRows.insertAt as (rows: StopRowData[], at: ListPlace, row: StopRowData) => StopRowData[];
/** Where the next add lands (`editor-rows.mjs`): the route or one path, and `pos`, null for the end of that list. */
export type Target = { splitId?: number; arm?: number; pos: number | null };
export const ROUTE_END = editorRows.ROUTE_END as Target;
/** The place a target names; a target whose path is gone is the end of the route. */
export const targetPlace = editorRows.targetPlace as (rows: StopRowData[], target: Target | null) => ListPlace;
/** True when the target's list exists: the route, or a path still in its block. */
export const targetExists = editorRows.targetExists as (rows: StopRowData[], target: Target) => boolean;
/** The first submit error the builder can open: a stop's key, or a path (block index and arm). */
export const firstErrorAt = editorRows.firstErrorAt as (keys: string[]) => { key?: string; index: number; arm?: number } | null;
export const targetAfterAdd = editorRows.targetAfterAdd as (target: Target) => Target;
export const targetAfterRemovePath = editorRows.targetAfterRemovePath as (rows: StopRowData[], target: Target, splitId: number, arm: number) => Target;
/** The add line at a place: the label the next stop takes there, and the row before it ("after stop 2"). */
export const nextStop = editorRows.nextStop as (
  rows: StopRowData[],
  at: ListPlace,
  tabs?: Record<number, number>,
) => { label: string; after: string };
/** Moves a row to a place (its index counted before the move); a split never into a path. */
export const moveRowTo = editorRows.moveRowTo as (rows: StopRowData[], id: number, at: ListPlace) => StopRowData[];
/** A drop zone under the pointer. */
export type DropZone =
  | { kind: "row"; key: string; after?: boolean }
  | { kind: "caption"; index: number; arm?: number; after?: boolean }
  | { kind: "path"; index: number; arm: number; at?: number }
  | { kind: "end" };
/** Where a drop lands; null where the dragged row cannot go. */
export const dropTarget = editorRows.dropTarget as (rows: StopRowData[], zone: DropZone, dragged: StopRowData | undefined) => ListPlace | null;
/** Removes a path; the second-last path turns the split into plain stops. */
export const removePath = editorRows.removePath as (rows: StopRowData[], splitId: number, arm: number) => StopRowData[];
/** Removes a split, keeping path `keep`'s stops in the main line. */
export const removeSplit = editorRows.removeSplit as (rows: StopRowData[], splitId: number, keep?: number) => StopRowData[];
/** The line shown when every path of a split is the same camps in the same order. */
export const SAME_CAMP_LINE = editorRows.SAME_CAMP_LINE as string;
/** True when every path visits the same camps in the same order. */
export const sameCampSequence = editorRows.sameCampSequence as (split: StopRowData["split"] | undefined) => boolean;
/** Sets a path label as typed; `commit` trims it (on blur). */
export const setArmLabel = editorRows.setArmLabel as (rows: StopRowData[], splitId: number, arm: number, label: string, commit?: boolean) => StopRowData[];
/** The open stop and the target when a change is made: undo puts the open stop back when it is gone, and
 *  this target when the current one no longer exists. */
export type Selection = { id: number | null; target: Target };
/** One undo entry: the stop list before a change, what changed and the selection then. */
export type UndoEntry = { rows: StopRowData[]; label: string; sel: Selection | null };
export const pushUndo = editorRows.pushUndo as (stack: UndoEntry[], rows: StopRowData[], label: string, sel?: Selection | null) => UndoEntry[];
export const popUndo = editorRows.popUndo as (stack: UndoEntry[]) => { entry: UndoEntry; stack: UndoEntry[] } | null;

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
