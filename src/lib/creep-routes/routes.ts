import "server-only";
import { isSanityConfigured, sanityClient } from "@/lib/content/sanity";
import { FIXTURE_ROUTES } from "./fixtures";
import type { CreepRoute } from "./types";
import { filterCreepRoutes, type CreepRouteFilter } from "./filter";

export { filterCreepRoutes, type CreepRouteFilter };

/**
 * Creep-route data access. Reads published `creepRoute` documents from
 * Sanity (drafts never reach the site — that is the review queue). The
 * bundled fixtures are used only in development when Sanity is unreachable
 * or has no routes; production always shows exactly what Sanity has.
 * Mirrors `src/lib/builds/builds.ts`. A route has no time dimension, so a
 * stop read from Sanity needs no conversion — it is already the domain
 * shape. `filterCreepRoutes` itself lives in `filter.mjs`/`.ts` (same
 * `.mjs`-pure/`.ts`-typed split as `submission.mjs`/`.ts`) so it's directly
 * testable with `node --test` — this file can't be run that way itself
 * (`server-only`, no type-stripping loader wired up for `.ts`) — and
 * re-exported here so callers don't need to know it moved.
 */

const USE_FIXTURES = process.env.NODE_ENV !== "production";

type RawRoute = Omit<CreepRoute, "map"> & {
  map: { slug: string; name: string; minimapUrl?: string } | null;
};

// `minimapUrl` rides along on `map->` (not a second read) so every route
// surface can show the map's thumbnail without re-fetching the full
// `CreepMap` catalogue (F009-followup-2).
const LIST_PROJECTION = `{
  "slug": slug.current,
  title, race, level, patch, mapVersion, start,
  "vsRaces": coalesce(vsRaces, []),
  "map": map->{ "slug": slug.current, "name": coalesce(title, name), "minimapUrl": minimap.asset->url },
  hero, summary, author, authorDiscord, maintainer, sourceUrl, videoUrl,
  "build": build->{ "slug": slug.current, title },
  "tags": coalesce(tags, []),
  "featured": coalesce(featured, false),
  publishedAt,
  "updatedAt": _updatedAt,
  stops
}`;

const DETAIL_PROJECTION = `{
  "slug": slug.current,
  title, race, level, patch, mapVersion, start,
  "vsRaces": coalesce(vsRaces, []),
  "map": map->{ "slug": slug.current, "name": coalesce(title, name), "minimapUrl": minimap.asset->url },
  hero, summary, author, authorDiscord, maintainer, sourceUrl, videoUrl,
  "build": build->{ "slug": slug.current, title },
  "tags": coalesce(tags, []),
  "featured": coalesce(featured, false),
  publishedAt,
  "updatedAt": _updatedAt,
  stops,
  description
}`;

/** A route whose `map` reference doesn't resolve (deleted, or not yet
 *  published — e.g. Northern Isles today, which has no `creepMap` document)
 *  is dropped rather than shown broken; `null` signals that to the caller. */
function normalizeRoute(doc: RawRoute): CreepRoute | null {
  if (!doc.map) return null;
  return { ...doc, map: doc.map };
}

function byUpdatedDesc(a: CreepRoute, b: CreepRoute) {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

// Server-only (calls into `normalizeRoute`/`console.warn`, both fine
// without Sanity, but the function itself is only ever reached from a
// `sanityClient()` fetch above) — no direct unit test; accepted, documented
// gap (gaps.md #5, docs/creep-routes.md's "Review flow" section).
function dropUnresolvedMaps(docs: RawRoute[]): CreepRoute[] {
  const routes: CreepRoute[] = [];
  for (const doc of docs) {
    const route = normalizeRoute(doc);
    if (!route) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[creep-routes] route "${doc.slug}" has no resolvable map, dropping from the list`);
      }
      continue;
    }
    routes.push(route);
  }
  return routes;
}

async function listFromSanity(): Promise<CreepRoute[] | null> {
  const client = sanityClient();
  if (!client) return null;
  try {
    const docs = await client.fetch<RawRoute[]>(
      `*[_type == "creepRoute" && defined(slug.current) && coalesce(reviewStatus, "approved") == "approved"] | order(_updatedAt desc) ${LIST_PROJECTION}`,
      {},
      { next: { revalidate: 300 } },
    );
    return dropUnresolvedMaps(docs);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[creep-routes] Sanity route list failed, using fixtures -", String(err));
    }
    return null;
  }
}

export async function getCreepRoutes(): Promise<CreepRoute[]> {
  if (isSanityConfigured()) {
    const live = await listFromSanity();
    if (live && (live.length || !USE_FIXTURES)) return live;
    if (!USE_FIXTURES) return [];
  }
  return USE_FIXTURES ? [...FIXTURE_ROUTES].sort(byUpdatedDesc) : [];
}

/** The slug of the approved route that replaced `slug`, if one did.
 *
 *  Archiving an old route would otherwise turn its URL — which people have
 *  bookmarked and linked in Discord — into a 404. When an author resubmits
 *  an update they name the route it replaces, so the successor can be found
 *  by walking that reference backwards and the reader is redirected to the
 *  current version instead of hitting a dead end.
 *
 *  Returns `undefined` when nothing supersedes it, which is the ordinary
 *  case; the caller then 404s as before. */
export async function getSupersedingRouteSlug(slug: string): Promise<string | undefined> {
  if (!isSanityConfigured()) return undefined;
  const client = sanityClient();
  if (!client) return undefined;
  try {
    const found = await client.fetch<string | null>(
      `*[_type == "creepRoute" && supersedes->slug.current == $slug && coalesce(reviewStatus, "approved") == "approved"]
         | order(_createdAt desc)[0].slug.current`,
      { slug },
      { next: { revalidate: 300 } },
    );
    return found ?? undefined;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[creep-routes] superseding-route lookup failed -", String(err));
    }
    return undefined;
  }
}

export async function getCreepRouteBySlug(slug: string): Promise<CreepRoute | undefined> {
  if (isSanityConfigured()) {
    const client = sanityClient();
    if (client) {
      try {
        const doc = await client.fetch<RawRoute | null>(
          `*[_type == "creepRoute" && slug.current == $slug && coalesce(reviewStatus, "approved") == "approved"][0]${DETAIL_PROJECTION}`,
          { slug },
          { next: { revalidate: 300 } },
        );
        if (doc && doc.title) {
          const route = normalizeRoute(doc);
          if (route) return route;
          if (process.env.NODE_ENV !== "production") {
            console.warn(`[creep-routes] route "${slug}" has no resolvable map`);
          }
        }
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[creep-routes] Sanity route fetch failed, using fixtures -", String(err));
        }
      }
    }
  }
  return USE_FIXTURES ? FIXTURE_ROUTES.find((r) => r.slug === slug) : undefined;
}

export async function getFeaturedCreepRoute(): Promise<CreepRoute | undefined> {
  const routes = await getCreepRoutes();
  return routes.find((r) => r.featured);
}

/** Approved routes that link to a given build order (usually one or two).
 *  Falls back to fixtures the same way `getCreepRoutes` does — a *live*
 *  but *empty* Sanity result (e.g. this dev environment: real Sanity
 *  builds, but zero `creepRoute` documents published yet, see "Publishing
 *  a map" in docs/creep-routes.md) still shows the fixture pairing in
 *  development, rather than silently hiding a build's routes card because
 *  Sanity happens to be configured *for other content types*. Found via
 *  F010's own browser verification: without this, `/learn/builds/[slug]`'s
 *  new "Creep routes for this build" card (item 7) could never be observed
 *  in exactly this environment — `getRoutesForBuild` used to return
 *  Sanity's empty array unconditionally instead of falling through. */
export async function getRoutesForBuild(buildSlug: string): Promise<CreepRoute[]> {
  if (isSanityConfigured()) {
    const client = sanityClient();
    if (client) {
      try {
        const docs = await client.fetch<RawRoute[]>(
          `*[_type == "creepRoute" && build->slug.current == $buildSlug && coalesce(reviewStatus, "approved") == "approved"] | order(_updatedAt desc) ${LIST_PROJECTION}`,
          { buildSlug },
          { next: { revalidate: 300 } },
        );
        const live = dropUnresolvedMaps(docs);
        if (live.length || !USE_FIXTURES) return live;
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[creep-routes] Sanity build-routes fetch failed -", String(err));
        }
        if (!USE_FIXTURES) return [];
      }
    }
  }
  if (!USE_FIXTURES) return [];
  return FIXTURE_ROUTES.filter((r) => r.build?.slug === buildSlug).sort(byUpdatedDesc);
}
