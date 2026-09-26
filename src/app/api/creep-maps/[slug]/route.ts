import { NextResponse } from "next/server";
import { getCreepMapBySlug } from "@/lib/creep-routes/maps";
import { toApiMap } from "@/lib/creep-routes/serialize";
import { notFoundHeaders, okHeaders, preflightHeaders } from "../../builds/_headers";

/** Public, read-only JSON API for a single creep map's full catalogue
 *  (`bounds`, `terrainBounds`, `cameraBounds`, `image`, `camps[]` with
 *  creeps, `starts`, `mines`, `shops`) — the list endpoint omits all but
 *  a `camps` count. */

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const origin = new URL(request.url).origin;
  const map = await getCreepMapBySlug(slug);
  if (!map) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: notFoundHeaders() });
  }
  return NextResponse.json({ map: toApiMap(map, origin) }, { status: 200, headers: okHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: preflightHeaders() });
}
