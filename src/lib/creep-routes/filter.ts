import * as impl from "./filter.mjs";
import type { BuildRace, BuildVsRace } from "@/lib/builds/types";
import type { CreepRoute, RouteLevel } from "./types";

/**
 * Typed façade over `filter.mjs`'s pure, plain-JS implementation — same
 * split as `submission.mjs`/`.ts`.
 */

export type CreepRouteFilter = {
  race?: BuildRace;
  vsRace?: BuildVsRace;
  map?: string;
  level?: RouteLevel;
  q?: string;
};

export const filterCreepRoutes = impl.filterCreepRoutes as (
  routes: CreepRoute[],
  f: CreepRouteFilter,
) => CreepRoute[];

export const featuredFirst = impl.featuredFirst as (
  routes: CreepRoute[],
  opts?: { apply?: boolean },
) => CreepRoute[];
