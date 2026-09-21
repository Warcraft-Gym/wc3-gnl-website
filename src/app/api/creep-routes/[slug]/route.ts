import { NextResponse } from "next/server";
import { getCreepRouteBySlug } from "@/lib/creep-routes/routes";
import { getCreepMapBySlug } from "@/lib/creep-routes/maps";
import { toApiRoute } from "@/lib/creep-routes/serialize";
import { notFoundHeaders, okHeaders, preflightHeaders } from "../../builds/_headers";

/** Public, read-only JSON API for a single approved creep route, including
 *  `description`, the optional companion `build` link, and `derived` (the
 *  running hero level/xp per stop) — the list endpoint omits all three. A
 *  route whose map doesn't resolve is dropped by the data layer already
 *  (see `routes.ts`), so 404 here just means "no such route". */

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const origin = new URL(request.url).origin;
  const route = await getCreepRouteBySlug(slug);
  if (!route) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: notFoundHeaders() });
  }
  const map = await getCreepMapBySlug(route.map.slug);
  if (!map) {
    // Same "map not resolvable" case routes.ts guards for lists — a
    // single fetched-by-slug route could in principle outrun that guard
    // if the map is unpublished/deleted between reads; treat it the same
    // way rather than crash.
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: notFoundHeaders() });
  }
  return NextResponse.json(
    { route: toApiRoute(route, map, origin) },
    { status: 200, headers: okHeaders() },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: preflightHeaders() });
}
