import { gameIconSrc } from "@/lib/builds/icons";
import { deriveRoute } from "./derive.mjs";
import type { CreepMap, CreepRoute, RouteStop } from "./types";

/**
 * Public JSON API DTOs, consumed by `src/app/api/creep-routes/**` and
 * `src/app/api/creep-maps/**` (F006). Mirrors `src/lib/builds/serialize.ts`'s
 * shape — `minimapUrl`/each unit icon turned into an absolute URL so a
 * desktop overlay on a different origin can load the art directly — with
 * one creep-route-specific addition: the detail DTO carries `derived` (the
 * running hero level/xp per stop, from `derive.mjs`'s `deriveRoute`, so a
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

/** List DTO. A deliberately explicit, narrower field set than the full
 *  route — no `description`, `build`, `authorDiscord`, `maintainer`,
 *  `sourceUrl`, `patch`: those are detail-only (see `ApiRoute`), keeping
 *  the list payload small. */
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

function toApiStop(stop: RouteStop, origin: string): ApiRouteStop {
  const { units, ...rest } = stop;
  return {
    ...rest,
    ...(units?.length
      ? { units: units.map((u) => ({ ...u, iconUrl: `${origin}${gameIconSrc(u.icon)}` })) }
      : {}),
  };
}

function absoluteMinimapUrl(map: CreepMap, origin: string): string {
  return map.minimapUrl.startsWith("http") ? map.minimapUrl : `${origin}${map.minimapUrl}`;
}

/** List DTO — see `ApiRouteListItem`'s own doc comment for what's omitted
 *  and why. `map.mapVersion` is the route's own recorded `mapVersion` (the
 *  catalogue version the route was written against), not a re-fetch of the
 *  live map document's version. */
export function toApiRouteListItem(route: CreepRoute, origin: string): ApiRouteListItem {
  return {
    slug: route.slug,
    title: route.title,
    race: route.race,
    vsRaces: route.vsRaces,
    level: route.level,
    map: { slug: route.map.slug, name: route.map.name, mapVersion: route.mapVersion },
    start: route.start,
    hero: route.hero,
    summary: route.summary,
    author: route.author,
    stops: route.stops.map((stop) => toApiStop(stop, origin)),
    featured: route.featured,
    publishedAt: route.publishedAt,
    updatedAt: route.updatedAt,
  };
}

/** Full detail DTO — includes `description` as stored (Portable Text
 *  blocks or plain strings, the client decides how to render it), the
 *  optional companion `build` link, and `derived` (the running hero
 *  level/xp per stop from `deriveRoute(route, map)` — `map` is the route's
 *  own map, already resolved by the caller, e.g.
 *  `getCreepMapBySlug(route.map.slug)`). */
export function toApiRoute(route: CreepRoute, map: CreepMap, origin: string): ApiRoute {
  const listItem = toApiRouteListItem(route, origin);
  const derived = deriveRoute(route, map) as {
    stops: { heroLevelAfter: number; xpAfter: number }[];
    finalLevel: number;
    finalXp: number;
  };
  return {
    ...listItem,
    description: route.description,
    build: route.build,
    derived: {
      stops: derived.stops.map((s) => ({
        heroLevelAfter: s.heroLevelAfter,
        xpAfter: s.xpAfter,
      })),
      finalLevel: derived.finalLevel,
      finalXp: derived.finalXp,
    },
  };
}

/** Map list DTO — see `ApiMapListItem`'s own doc comment. */
export function toApiMapListItem(map: CreepMap, origin: string): ApiMapListItem {
  return {
    slug: map.slug,
    name: map.name,
    mapVersion: map.mapVersion,
    w3cMapId: map.w3cMapId,
    image: map.image,
    camps: map.camps.length,
    minimapUrl: absoluteMinimapUrl(map, origin),
  };
}

/** Map detail DTO — see `ApiMap`'s own doc comment. */
export function toApiMap(map: CreepMap, origin: string): ApiMap {
  return { ...map, minimapUrl: absoluteMinimapUrl(map, origin) };
}
