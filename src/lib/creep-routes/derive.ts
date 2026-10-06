import * as impl from "./derive.mjs";
import type { CreepMap, MapCamp, MapCampCreep, RouteStop } from "./types";

/**
 * Typed façade over `derive.mjs`'s pure, plain-JS implementation — same
 * split as `submission.mjs`/`.ts`. `serialize.ts` imports `deriveRoute`
 * from here (not straight from `derive.mjs`) so it can hand a *typed*
 * function reference into `serialize.mjs`'s pure DTO builder instead of
 * casting the raw `.mjs` call's return value inline (code-a.md, "Should
 * fix": `serialize.ts` used to carry an undocumented `as {...}` there).
 * Components import `deriveRoute` from here too, for the typed `kills` trace.
 */

export type DerivedStop = {
  campId: string | null;
  camp: MapCamp | null;
  heroLevelAfter: number;
  xpAfter: number;
  campLevel: number | null;
  band: string | null;
  /** Creeps a stop skips (`leaveRest`). */
  left: number;
  /** One entry per kill, in kill order. */
  kills: DerivedKill[];
  /** Arm stops only: which arm of which split (the split's top-level key). */
  armIndex?: number;
  forkKey?: string;
  /** Split stops only: every arm derived from the hero's state at the split; `walked` is the arm the total follows. */
  split?: DerivedNode;
};

export type DerivedNode = {
  mode: "and" | "or" | "xor";
  walked: number;
  arms: { label?: string; stops: DerivedStop[]; levelAfter: number; xpAfter: number }[];
  /** The hero at the split. An open stop inside an "and" block shows this level. */
  levelBefore: number;
  xpBefore: number;
  /** The hero after the split and the XP the block paid: an "and" block's join row. */
  levelAfter: number;
  xpGained: number;
};

export type DerivedKill = {
  creep: MapCampCreep;
  /** Index into the camp's `creeps[]`. */
  row: number;
  /** True for a kill in the authored list, false for the rest of the camp. */
  ordered: boolean;
  /** 0-based index of the unit (a single kill or a set) this kill belongs to. */
  unit: number;
  /** True when that unit is a set (kills in any order). */
  inSet: boolean;
  /** XP this kill paid, at the hero's level at that moment. */
  xp: number;
  levelAfter: number;
  /** True when this kill took the hero to a new level. */
  leveledUp: boolean;
};

export type DerivedRoute = {
  stops: DerivedStop[];
  finalLevel: number;
  finalXp: number;
};

type PlainDerivable = Pick<RouteStop, "campId" | "kills" | "leaveRest" | "hero">;
type DerivableStop = PlainDerivable & {
  split?: { mode: "and" | "or" | "xor"; arms: { label?: string; stops: PlainDerivable[] }[] };
};

export const deriveRoute = impl.deriveRoute as (
  route: { stops: DerivableStop[] },
  map: CreepMap,
  /** `choice`: split key ("2") to the arm the hero walks in an "or" split; default 0. */
  opts?: { startLevel?: number; choice?: Record<string, number> },
) => DerivedRoute;
