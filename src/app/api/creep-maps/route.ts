import { NextResponse } from "next/server";
import { getCreepMaps } from "@/lib/creep-routes/maps";
import { toApiMapListItem } from "@/lib/creep-routes/serialize";
import { okHeaders, preflightHeaders } from "../builds/_headers";

/**
 * Public, read-only JSON API for creep-route maps. Consumed by the desktop
 * overlay (a different origin), hence the open CORS policy — the data is
 * already public on the site. `camps` is a count here to keep the list
 * payload small; `GET /api/creep-maps/<slug>` returns the full catalogue.
 */

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const maps = await getCreepMaps();
  const body = { maps: maps.map((m) => toApiMapListItem(m, origin)) };
  return NextResponse.json(body, { status: 200, headers: okHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: preflightHeaders() });
}
