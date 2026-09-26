import * as impl from "./derive.mjs";
import type { CreepMap, CreepRoute, MapCamp } from "./types";

/**
 * Typed façade over `derive.mjs`'s pure, plain-JS implementation — same
 * split as `submission.mjs`/`.ts`. `serialize.ts` imports `deriveRoute`
 * from here (not straight from `derive.mjs`) so it can hand a *typed*
 * function reference into `serialize.mjs`'s pure DTO builder instead of
 * casting the raw `.mjs` call's return value inline (code-a.md, "Should
 * fix": `serialize.ts` used to carry an undocumented `as {...}` there).
 * `StopEditor.tsx`/`RouteStepTable.tsx` still import `derive.mjs` directly
 * — out of scope here, unrelated to that cast.
 */

export type DerivedStop = {
  campId: string | null;
  camp: MapCamp | null;
  heroLevelAfter: number;
  xpAfter: number;
  campLevel: number | null;
  band: string | null;
};

export type DerivedRoute = {
  stops: DerivedStop[];
  finalLevel: number;
  finalXp: number;
};

export const deriveRoute = impl.deriveRoute as (
  route: CreepRoute,
  map: CreepMap,
  opts?: { startLevel?: number },
) => DerivedRoute;
