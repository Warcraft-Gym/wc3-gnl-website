import { gameIconSrc } from "@/lib/builds/icons";
import * as impl from "./serialize.mjs";
import { deriveRoute } from "./derive";
import type { CreepMap, CreepRoute } from "./types";

/**
 * Typed façade over `serialize.mjs`'s pure DTO-mapping implementation —
 * same split as `submission.mjs`/`.ts`. Consumed by `src/app/api/creep-routes/**`
 * and `src/app/api/creep-maps/**` (F006). Mirrors `src/lib/builds/serialize.ts`'s
 * shape — `minimapUrl`/each unit icon turned into an absolute URL so a
 * desktop overlay on a different origin can load the art directly — with
 * one creep-route-specific addition: the detail DTO carries `derived` (the
 * running hero level/xp per stop, from `derive.ts`'s `deriveRoute`, so a
 * consumer doesn't need to reimplement the XP model). A route has no time
 * dimension, so a stop is just its ordered fields, nothing derived from a
 * clock.
 */

export type ApiRouteStop = {
  campId: string | null;
  action?: string;
  units?: { icon: string; count: number; iconUrl: string }[];
  note?: string;
  condition?: string;
};

/** List DTO — see `toApiRouteListItem`'s own doc comment (in `serialize.mjs`)
 *  for what's omitted and why. */
export type ApiRouteListItem = {
  slug: string;
  title: string;
  race: CreepRoute["race"];
  vsRaces: CreepRoute["vsRaces"];
  level: CreepRoute["level"];
  map: { slug: string; name: string; mapVersion?: string };
  /** Index into `map.starts` — which spawn is *your* base; omitted means
   *  the first start (0). See `CreepRoute.start`'s own doc comment. */
  start?: number;
  hero?: string;
  summary: string;
  author: string;
  /** Shown as chips, exactly like builds' own `tags` (F009 added the type
   *  and display code; F010 wires it through persistence and the API). */
  tags: string[];
  stops: ApiRouteStop[];
  featured: boolean;
  publishedAt: string;
  updatedAt: string;
};

export type ApiRouteDerivedStop = { heroLevelAfter: number; xpAfter: number };

/** Detail DTO — adds `description`, the optional companion `build` link,
 *  and `derived` (requires the route's own `CreepMap` to compute — see
 *  `toApiRoute`). */
export type ApiRoute = ApiRouteListItem & {
  description?: CreepRoute["description"];
  build?: { slug: string; title: string } | null;
  derived: {
    stops: ApiRouteDerivedStop[];
    finalLevel: number;
    finalXp: number;
  };
};

/** Map list DTO — `camps` is a *count*, not the full array, to keep the
 *  map list payload small; `GET /api/creep-maps/<slug>` returns the full
 *  catalogue (`ApiMap`). */
export type ApiMapListItem = {
  slug: string;
  name: string;
  mapVersion?: string;
  w3cMapId: number;
  image: { width: number; height: number };
  camps: number;
  minimapUrl: string;
};

/** Map detail DTO — the entire catalogue (`bounds`, `terrainBounds`,
 *  `cameraBounds`, `image`, `camps[]` with creeps, `starts`, `mines`,
 *  `shops`), `minimapUrl` made absolute. */
export type ApiMap = Omit<CreepMap, "minimapUrl"> & { minimapUrl: string };

/** List DTO — see `ApiRouteListItem`'s own doc comment for what's omitted
 *  and why. `map.mapVersion` is the route's own recorded `mapVersion` (the
 *  catalogue version the route was written against), not a re-fetch of the
 *  live map document's version. */
export function toApiRouteListItem(route: CreepRoute, origin: string): ApiRouteListItem {
  return impl.toApiRouteListItem(route, origin, gameIconSrc) as ApiRouteListItem;
}

/** Full detail DTO — includes `description` as stored (Portable Text
 *  blocks or plain strings, the client decides how to render it), the
 *  optional companion `build` link, and `derived` (the running hero
 *  level/xp per stop from `deriveRoute(route, map)` — `map` is the route's
 *  own map, already resolved by the caller, e.g.
 *  `getCreepMapBySlug(route.map.slug)`). */
export function toApiRoute(route: CreepRoute, map: CreepMap, origin: string): ApiRoute {
  return impl.toApiRoute(route, map, origin, gameIconSrc, deriveRoute) as ApiRoute;
}

/** Map list DTO — see `ApiMapListItem`'s own doc comment. */
export function toApiMapListItem(map: CreepMap, origin: string): ApiMapListItem {
  return impl.toApiMapListItem(map, origin) as ApiMapListItem;
}

/** Map detail DTO — see `ApiMap`'s own doc comment. */
export function toApiMap(map: CreepMap, origin: string): ApiMap {
  return impl.toApiMap(map, origin) as ApiMap;
}
