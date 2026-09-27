import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { consentRequired } from "@/lib/geo.mjs";

/**
 * Whether this reader has to be asked before anything is stored.
 *
 * The check lives in its own route rather than in the layout on purpose.
 * Reading a header in the root layout opts the whole tree into dynamic
 * rendering, which would turn 40 cached routes into per-request renders for
 * the sake of a banner. One small uncached endpoint costs a single request
 * from the consent banner and leaves every page cacheable.
 *
 * `x-vercel-ip-country` is set by Vercel's edge. Off Vercel it is absent,
 * `consentRequired` treats that as "ask", and the banner shows.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const country = (await headers()).get("x-vercel-ip-country");
  return NextResponse.json(
    { country: country ?? null, consentRequired: consentRequired(country) },
    // Never cached, by us or anything in front of us: the answer is
    // per-reader, and a cached "no consent needed" served to an EU reader is
    // the one mistake this must not make.
    { headers: { "cache-control": "no-store" } },
  );
}
