import "server-only";
import { isSanityConfigured, sanityClient } from "@/lib/content/sanity";
import type { BuildRace, BuildVsRace } from "@/lib/builds/types";
import { FIXTURE_ROUTES } from "./fixtures";
import type { CreepRoute, RouteLevel } from "./types";

/**
 * Creep-route data access. Reads published `creepRoute` documents from
 * Sanity (drafts never reach the site — that is the review queue). The
 * bundled fixtures are used only in development when Sanity is unreachable
 * or has no routes; production always shows exactly what Sanity has.
 * Mirrors `src/lib/builds/builds.ts`. A route has no time dimension, so a
 * stop read from Sanity needs no conversion — it is already the domain
 * shape.
 */

const USE_FIXTURES = process.env.NODE_ENV !== "production";

type RawRoute = Omit<CreepRoute, "map"> & {
  map: { slug: string; name: string } | null;
};

const LIST_PROJECTION = `{
  "slug": slug.current,
  title, race, level, patch, mapVersion, start,
  "vsRaces": coalesce(vsRaces, []),
  "map": map->{ "slug": slug.current, name },
  hero, summary, author, authorDiscord, maintainer, sourceUrl,
  "build": build->{ "slug": slug.current, title },
  "featured": coalesce(featured, false),
  publishedAt,
  "updatedAt": _updatedAt,
  stops
}`;

const DETAIL_PROJECTION = `{
  "slug": slug.current,
  title, race, level, patch, mapVersion, start,
  "vsRaces": coalesce(vsRaces, []),
  "map": map->{ "slug": slug.current, name },
  hero, summary, author, authorDiscord, maintainer, sourceUrl,
  "build": build->{ "slug": slug.current, title },
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

export type CreepRouteFilter = {
  race?: BuildRace;
  vsRace?: BuildVsRace;
  map?: string;
  level?: RouteLevel;
  q?: string;
};

/** Filter helper shared by the list page. `vsRace` matches routes written
 *  for that opponent (among others) or for any opponent; `map` matches the
 *  map slug. */
export function filterCreepRoutes(routes: CreepRoute[], f: CreepRouteFilter): CreepRoute[] {
  const q = f.q?.trim().toLowerCase();
  return routes.filter((r) => {
    if (f.race && r.race !== f.race) return false;
    if (f.vsRace && f.vsRace !== "any" && r.vsRaces.length && !r.vsRaces.includes(f.vsRace)) return false;
    if (f.map && r.map.slug !== f.map) return false;
    if (f.level && r.level !== f.level) return false;
    if (q) {
      const hay = [r.title, r.summary, r.author, r.map.name].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export async function getFeaturedCreepRoute(): Promise<CreepRoute | undefined> {
  const routes = await getCreepRoutes();
  return routes.find((r) => r.featured);
}

/** Approved routes that link to a given build order (usually one or two). */
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
        return dropUnresolvedMaps(docs);
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[creep-routes] Sanity build-routes fetch failed -", String(err));
        }
        return [];
      }
    }
  }
  if (!USE_FIXTURES) return [];
  return FIXTURE_ROUTES.filter((r) => r.build?.slug === buildSlug).sort(byUpdatedDesc);
}
