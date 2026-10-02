import type { ExchangeCreepRoute } from "@/lib/creep-routes/exchange";
import type { StopInput } from "@/lib/creep-routes/submission";
import type { StopRowData } from "./StopRow";
import * as editorRows from "@/lib/creep-routes/editor-rows.mjs";

/** A fresh editor row; `patch` sets the camp, the place or the fork. */
export const newRow = editorRows.newRow as (patch?: Partial<StopRowData>) => StopRowData;

/** An editor row as a submitted stop: the shape of the form's `stopsJson`, the map's route and `deriveRoute`'s input. */
export function rowToStop(s: StopRowData): StopInput {
  if (s.fork) {
    return {
      campId: null,
      fork: { mode: s.fork.mode, arms: s.fork.arms.map((arm) => ({ label: arm.label.trim() || undefined, stops: arm.stops.map(rowToStop) })) },
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

/** An imported (`#route=`) stop as an editor row, fork arms included. */
export function stopToRow(s: ExchangeStop | Omit<ExchangeStop, "fork">): StopRowData {
  if ("fork" in s && s.fork) {
    return newRow({
      fork: { mode: s.fork.mode, arms: s.fork.arms.map((arm) => ({ id: Date.now() + Math.random(), label: arm.label ?? "", stops: arm.stops.map(stopToRow) })) },
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

/** Adds a camp stop, or removes it when the list already has it (the map's click toggle). */
export const toggleCamp = editorRows.toggleCamp as (rows: StopRowData[], campId: string) => StopRowData[];

/** A map click with no way active: removes the camp from the fork way that holds it, else toggles it at the top level. */
export const toggleCampAnywhere = editorRows.toggleCampAnywhere as (rows: StopRowData[], campId: string) => StopRowData[];

/** Applies `update` to the stops of arm `arm` of the fork row `forkId`. */
export const updateArm = editorRows.updateArm as (
  rows: StopRowData[],
  forkId: number,
  arm: number,
  update: (stops: StopRowData[]) => StopRowData[],
) => StopRowData[];
