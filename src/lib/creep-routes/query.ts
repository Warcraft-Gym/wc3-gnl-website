import * as impl from "./query.mjs";
import type { BuildRace, BuildVsRace } from "@/lib/builds/types";
import type { RouteLevel } from "./types";

/** Typed façade over `query.mjs`'s pure, plain-JS implementation — same
 *  split as `submission.mjs`/`.ts`. */

export type RawRouteQuery = {
  race?: string | null;
  vs?: string | null;
  level?: string | null;
  map?: string | null;
};

export type RouteQueryCatalogue = {
  raceIds: string[];
  levelIds: string[];
  mapSlugs: string[];
};

export type ParsedRouteQuery = {
  race?: BuildRace;
  vsRace?: BuildVsRace;
  level?: RouteLevel;
  map?: string;
};

export const parseRouteQuery = impl.parseRouteQuery as (
  params: RawRouteQuery,
  catalogue: RouteQueryCatalogue,
) => ParsedRouteQuery;
