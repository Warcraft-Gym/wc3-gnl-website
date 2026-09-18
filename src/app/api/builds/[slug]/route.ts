import { NextResponse } from "next/server";
import { getBuildBySlug } from "@/lib/builds/builds";
import { toApiBuild } from "@/lib/builds/serialize";
import { notFoundHeaders, okHeaders, preflightHeaders } from "../_headers";

/** Public, read-only JSON API for a single published build order, including
 *  `description` (the list endpoint omits it). */

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const origin = new URL(request.url).origin;
  const build = await getBuildBySlug(slug);
  if (!build) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: notFoundHeaders() });
  }
  return NextResponse.json({ build: toApiBuild(build, origin) }, { status: 200, headers: okHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: preflightHeaders() });
}
