import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Sanity → Next revalidation. A Sanity webhook (project settings → API →
 * Webhooks) POSTs here on create/update/delete; we verify the signature and
 * purge the pages that render that document type, so publishing a build or
 * a post shows up on the site immediately instead of after the ISR window.
 *
 * Env: SANITY_REVALIDATE_SECRET (the webhook's secret).
 */

const SECRET = process.env.SANITY_REVALIDATE_SECRET;
const SIGNATURE_HEADER = "sanity-webhook-signature";

/** Sanity signs `${timestamp}.${body}` with HMAC-SHA256, base64url. */
function isValid(header: string | null, body: string): boolean {
  if (!SECRET || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=") as [string, string]));
  const ts = parts.t;
  const sig = parts.v1;
  if (!ts || !sig) return false;
  const expected = createHmac("sha256", SECRET).update(`${ts}.${body}`).digest("base64url");
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Payload = { _type?: string; slug?: { current?: string } | string };

const PATHS: Record<string, (slug?: string) => string[]> = {
  buildOrder: (slug) => [
    "/learn/builds",
    ...(slug ? [`/learn/builds/${slug}`] : []),
    "/learn/human", "/learn/orc", "/learn/night-elf", "/learn/undead",
    "/",
    "/api/builds",
    ...(slug ? [`/api/builds/${slug}`] : []),
  ],
  post: (slug) => ["/blog", ...(slug ? [`/blog/${slug}`] : []), "/"],
  tool: () => ["/tools"],
  guide: (slug) => ["/learn", ...(slug ? [`/learn/guide/${slug}`] : []), "/"],
  creepRoute: (slug) => [
    "/learn/creep-routes",
    ...(slug ? [`/learn/creep-routes/${slug}`] : []),
    "/",
    "/api/creep-routes",
    ...(slug ? [`/api/creep-routes/${slug}`] : []),
  ],
  creepMap: (slug) => ["/learn/creep-routes", ...(slug ? [`/api/creep-maps/${slug}`] : [])],
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  if (!isValid(req.headers.get(SIGNATURE_HEADER), body)) {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }

  let payload: Payload = {};
  try {
    payload = JSON.parse(body) as Payload;
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }

  const type = payload._type ?? "";
  const slug = typeof payload.slug === "string" ? payload.slug : payload.slug?.current;
  const paths = PATHS[type]?.(slug);
  if (!paths) return NextResponse.json({ ok: true, skipped: type });

  for (const p of paths) revalidatePath(p);
  return NextResponse.json({ ok: true, type, revalidated: paths });
}
