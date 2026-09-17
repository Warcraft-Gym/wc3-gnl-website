import { NextResponse } from "next/server";
import { getBuilds } from "@/lib/builds/builds";
import { toApiBuildListItem } from "@/lib/builds/serialize";
import { okHeaders, preflightHeaders } from "./_headers";

/**
 * Public, read-only JSON API for published build orders. Consumed by the
 * desktop overlay (a different origin), hence the open CORS policy — the
 * data is already public on the site.
 */

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const builds = await getBuilds();
  const body = { builds: builds.map((b) => toApiBuildListItem(b, origin)) };
  return NextResponse.json(body, { status: 200, headers: okHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: preflightHeaders() });
}
