import type { ExchangeCreepRoute } from "@/lib/creep-routes/exchange";
import type { StopInput } from "@/lib/creep-routes/submission";
import type { StopRowData } from "./StopRow";

/** A fresh editor row; `patch` sets the camp, the place or the fork. */
export function newRow(patch: Partial<StopRowData> = {}): StopRowData {
  return { id: Date.now() + Math.random(), campId: null, action: "", units: [], note: "", condition: "", kills: [], leaveRest: false, ...patch };
}

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
    heroAbsent: s.campId && s.heroAbsent ? true : undefined,
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
    heroAbsent: s.heroAbsent,
  });
}

/** Adds a camp stop, or removes it when the list already has it (the map's click toggle). */
export function toggleCamp(rows: StopRowData[], campId: string): StopRowData[] {
  const idx = rows.findIndex((r) => r.campId === campId);
  return idx !== -1 ? rows.filter((_, i) => i !== idx) : [...rows, newRow({ campId })];
}

/** Applies `update` to the stops of arm `arm` of the fork row `forkId`. */
export function updateArm(rows: StopRowData[], forkId: number, arm: number, update: (stops: StopRowData[]) => StopRowData[]): StopRowData[] {
  return rows.map((r) =>
    r.id === forkId && r.fork
      ? { ...r, fork: { ...r.fork, arms: r.fork.arms.map((a, i) => (i === arm ? { ...a, stops: update(a.stops) } : a)) } }
      : r,
  );
}
