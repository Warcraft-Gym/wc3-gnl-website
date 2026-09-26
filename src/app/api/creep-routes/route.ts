import { NextResponse } from "next/server";
import { BUILD_RACES } from "@/lib/builds/types";
import { filterCreepRoutes, getCreepRoutes } from "@/lib/creep-routes/routes";
import { getCreepMaps } from "@/lib/creep-routes/maps";
import { ROUTE_LEVELS } from "@/lib/creep-routes/types";
import { toApiRouteListItem } from "@/lib/creep-routes/serialize";
import { parseRouteQuery } from "@/lib/creep-routes/query";
import { okHeaders, preflightHeaders } from "../builds/_headers";

/**
 * Public, read-only JSON API for approved creep routes. Consumed by the
 * desktop overlay (a different origin), hence the open CORS policy — the
 * data is already public on the site. Query filters mirror
 * `/learn/creep-routes`'s own URL params (`race`, `vs`, `map`, `level`);
 * an invalid value is silently ignored rather than erroring, same as the
 * list page — the actual parsing is `query.mjs`'s pure, unit-tested
 * `parseRouteQuery` (`query.test.mjs`).
 */

const RACE_IDS = BUILD_RACES.map((r) => r.id);
const LEVEL_IDS = ROUTE_LEVELS.map((l) => l.id);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const sp = url.searchParams;

  const [all, mapList] = await Promise.all([getCreepRoutes(), getCreepMaps()]);

  const { race, vsRace, level, map } = parseRouteQuery(
    { race: sp.get("race"), vs: sp.get("vs"), level: sp.get("level"), map: sp.get("map") },
    { raceIds: RACE_IDS, levelIds: LEVEL_IDS, mapSlugs: mapList.map((m) => m.slug) },
  );

  const routes = filterCreepRoutes(all, { race, vsRace, map, level });
  const body = { routes: routes.map((r) => toApiRouteListItem(r, origin)) };
  return NextResponse.json(body, { status: 200, headers: okHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: preflightHeaders() });
}
