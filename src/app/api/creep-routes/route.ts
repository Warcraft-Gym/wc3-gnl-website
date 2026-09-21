import { NextResponse } from "next/server";
import { BUILD_RACES, type BuildRace, type BuildVsRace } from "@/lib/builds/types";
import { filterCreepRoutes, getCreepRoutes } from "@/lib/creep-routes/routes";
import { getCreepMaps } from "@/lib/creep-routes/maps";
import { ROUTE_LEVELS, type RouteLevel } from "@/lib/creep-routes/types";
import { toApiRouteListItem } from "@/lib/creep-routes/serialize";
import { okHeaders, preflightHeaders } from "../builds/_headers";

/**
 * Public, read-only JSON API for approved creep routes. Consumed by the
 * desktop overlay (a different origin), hence the open CORS policy — the
 * data is already public on the site. Query filters mirror
 * `/learn/creep-routes`'s own URL params (`race`, `vs`, `map`, `level`);
 * an invalid value is silently ignored rather than erroring, same as the
 * list page.
 */

const RACE_IDS = new Set(BUILD_RACES.map((r) => r.id));
const LEVEL_IDS = new Set(ROUTE_LEVELS.map((l) => l.id));

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const sp = url.searchParams;

  const race = RACE_IDS.has(sp.get("race") as BuildRace) ? (sp.get("race") as BuildRace) : undefined;
  const vsRace = RACE_IDS.has(sp.get("vs") as BuildRace) ? (sp.get("vs") as BuildVsRace) : undefined;
  const level = LEVEL_IDS.has(sp.get("level") as RouteLevel) ? (sp.get("level") as RouteLevel) : undefined;

  const [all, mapList] = await Promise.all([getCreepRoutes(), getCreepMaps()]);
  const requestedMap = sp.get("map");
  const map = requestedMap && mapList.some((m) => m.slug === requestedMap) ? requestedMap : undefined;

  const routes = filterCreepRoutes(all, { race, vsRace, map, level });
  const body = { routes: routes.map((r) => toApiRouteListItem(r, origin)) };
  return NextResponse.json(body, { status: 200, headers: okHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: preflightHeaders() });
}
