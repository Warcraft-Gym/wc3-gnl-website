import { purgeType } from "@/lib/content/revalidate";
import { isSanityConfigured, sanityClient } from "@/lib/content/sanity";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Revalidation from the Studio's own Publish button.
 *
 * The webhook (`../route.ts`) is the usual path, but it lives in Sanity's
 * project settings, outside this repo, and when it breaks nothing on the site
 * says so: an approved route simply doesn't appear until the cache backstop
 * runs out. Since the backstop is now a day, the Studio (mounted at /studio on
 * this site) also calls here after every publish, so an edit shows without
 * depending on the webhook.
 *
 * No secret can live in the Studio's browser bundle, so this route is open and
 * proves the edit itself instead: it reads the document from Sanity (not the
 * CDN) and only purges when that published document changed in the last few
 * minutes. The worst an outsider can do is purge the cache for a document an
 * editor really did just publish, which the editor was about to do anyway.
 */

/** How recent a publish must be for this route to act on it. */
const RECENT_MS = 10 * 60 * 1000;

const ID = /^[A-Za-z0-9._-]{1,128}$/;

export async function POST(req: NextRequest) {
  let id = "";
  try {
    id = String(((await req.json()) as { id?: unknown }).id ?? "");
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  // Only published documents: a draft never renders on the site.
  id = id.replace(/^drafts\./, "");
  if (!ID.test(id)) return NextResponse.json({ ok: false, error: "bad id" }, { status: 400 });

  const client = isSanityConfigured() ? sanityClient() : null;
  if (!client) return NextResponse.json({ ok: false, error: "sanity not configured" }, { status: 503 });

  // `useCdn: false`: the CDN can lag a publish by a few seconds, and this
  // check is about what was just written.
  const doc = await client
    .withConfig({ useCdn: false })
    .fetch<{ _type: string; _updatedAt: string; slug?: string } | null>(
      `*[_id == $id][0]{ _type, _updatedAt, "slug": slug.current }`,
      { id },
      { cache: "no-store" },
    );
  if (!doc) return NextResponse.json({ ok: true, skipped: "not published" });
  if (Date.now() - Date.parse(doc._updatedAt) > RECENT_MS) {
    return NextResponse.json({ ok: true, skipped: "not a recent edit" });
  }

  const paths = purgeType(doc._type, doc.slug);
  if (!paths) return NextResponse.json({ ok: true, skipped: doc._type });
  return NextResponse.json({ ok: true, type: doc._type, revalidated: paths });
}
