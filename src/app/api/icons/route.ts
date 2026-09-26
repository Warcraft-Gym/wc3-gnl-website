import { NextResponse } from "next/server";
import { ALL_ICONS, gameIconSrc } from "@/lib/builds/icons";
import { okHeaders, preflightHeaders } from "../builds/_headers";

/**
 * Public, read-only JSON API for the WC3 icon manifest. Consumed by the
 * desktop overlay's build editor (a different origin) so it can render the
 * icon picker without shipping its own copy of the manifest, hence the same
 * open CORS policy as `/api/builds` — the data is already public on the site.
 */

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const body = {
    icons: ALL_ICONS.map((icon) => ({ ...icon, url: `${origin}${gameIconSrc(icon.key)}` })),
  };
  return NextResponse.json(body, { status: 200, headers: okHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: preflightHeaders() });
}
