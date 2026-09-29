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
  /** Creeps left alive by a stop with a partial `kills` list. */
  left: number;
  /** One entry per kill, in kill order. */
  kills: DerivedKill[];
};

export type DerivedKill = {
  creep: MapCampCreep;
  /** Index into the camp's `creeps[]`. */
  row: number;
  /** True for a kill in the authored prefix, false for the rest of the camp. */
  ordered: boolean;
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

export const deriveRoute = impl.deriveRoute as (
  route: { stops: Pick<RouteStop, "campId" | "kills" | "leaveRest">[] },
  map: CreepMap,
  opts?: { startLevel?: number },
) => DerivedRoute;
