import { gameIconSrc } from "@/lib/builds/icons";
import type { CreepMap, CreepRoute, RouteStop } from "./types";

/**
 * Public JSON API DTOs (the routes land in F006; this feature only ships the
 * serializer). Same shape as the domain types, with `minimapUrl` and each
 * unit icon turned into an absolute URL so a desktop overlay on a different
 * origin can load the art directly, mirroring `src/lib/builds/serialize.ts`.
 */

export type ApiRouteStop = Omit<RouteStop, "units"> & {
  units?: { icon: string; count: number; iconUrl: string }[];
};

export type ApiRoute = Omit<CreepRoute, "stops" | "description"> & {
  stops: ApiRouteStop[];
  description?: CreepRoute["description"];
};

export type ApiRouteListItem = Omit<ApiRoute, "description">;

export type ApiMap = Omit<CreepMap, "minimapUrl"> & { minimapUrl: string };

function toApiStop(stop: RouteStop, origin: string): ApiRouteStop {
  const { units, ...rest } = stop;
  if (!units?.length) return { ...rest };
  return {
    ...rest,
    units: units.map((u) => ({ ...u, iconUrl: `${origin}${gameIconSrc(u.icon)}` })),
  };
}

/** Full detail DTO — includes `description` as stored (Portable Text blocks
 *  or plain strings), the client decides how to render it. */
export function toApiRoute(route: CreepRoute, origin: string): ApiRoute {
  return {
    ...route,
    stops: route.stops.map((stop) => toApiStop(stop, origin)),
  };
}

/** List DTO — omits `description` to keep the list payload small. */
export function toApiRouteListItem(route: CreepRoute, origin: string): ApiRouteListItem {
  const full = toApiRoute(route, origin);
  return Object.fromEntries(
    Object.entries(full).filter(([key]) => key !== "description"),
  ) as ApiRouteListItem;
}

/** Map DTO — `minimapUrl` is already absolute-or-site-relative on the
 *  domain type; this makes it absolute (`<origin>/maps/<slug>.png`) when
 *  it's still a fixture's site-relative path. */
export function toApiMap(map: CreepMap, origin: string): ApiMap {
  const minimapUrl = map.minimapUrl.startsWith("http") ? map.minimapUrl : `${origin}${map.minimapUrl}`;
  return { ...map, minimapUrl };
}
