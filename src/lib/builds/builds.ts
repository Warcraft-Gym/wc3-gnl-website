import "server-only";
import { isSanityConfigured, sanityClient } from "@/lib/content/sanity";
import { FIXTURE_BUILDS } from "./fixtures";
import type { BuildOrder, BuildRace, BuildVsRace } from "./types";

/**
 * Build-order data access. Reads published `buildOrder` documents from Sanity
 * (drafts never reach the site, that is the review queue). The bundled
 * fixtures are used only in development when Sanity is unreachable or has
 * no builds; production always shows exactly what Sanity has, so an empty
 * library reads as empty rather than as fake content. Lists omit the
 * description; the detail fetch includes it.
 */

const USE_FIXTURES = process.env.NODE_ENV !== "production";

const LIST_PROJECTION = `{
  "slug": slug.current,
  title, race, vsRace, difficulty, patch,
  "tags": coalesce(tags, []),
  summary, author, authorDiscord, maintainer, sourceUrl,
  "featured": coalesce(featured, false),
  publishedAt,
  "updatedAt": _updatedAt,
  steps
}`;

const DETAIL_PROJECTION = `{
  "slug": slug.current,
  title, race, vsRace, difficulty, patch,
  "tags": coalesce(tags, []),
  summary, author, authorDiscord, maintainer, sourceUrl,
  "guide": guide->{ "slug": slug.current, title },
  "featured": coalesce(featured, false),
  publishedAt,
  "updatedAt": _updatedAt,
  steps,
  description
}`;

function byUpdatedDesc(a: BuildOrder, b: BuildOrder) {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

async function listFromSanity(): Promise<BuildOrder[] | null> {
  const client = sanityClient();
  if (!client) return null;
  try {
    return await client.fetch<BuildOrder[]>(
      `*[_type == "buildOrder" && defined(slug.current) && coalesce(reviewStatus, "approved") == "approved"] | order(_updatedAt desc) ${LIST_PROJECTION}`,
      {},
      { next: { revalidate: 300 } },
    );
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[builds] Sanity list failed, using fixtures -", String(err));
    }
    return null;
  }
}

export async function getBuilds(): Promise<BuildOrder[]> {
  if (isSanityConfigured()) {
    const live = await listFromSanity();
    if (live && (live.length || !USE_FIXTURES)) return live;
    if (!USE_FIXTURES) return [];
  }
  return USE_FIXTURES ? [...FIXTURE_BUILDS].sort(byUpdatedDesc) : [];
}

export type BuildFilter = {
  race?: BuildRace;
  vsRace?: BuildVsRace;
  q?: string;
};

/** Filter helper shared by the list page. `vsRace` matches builds written
 *  for that opponent or for "any". */
export function filterBuilds(builds: BuildOrder[], f: BuildFilter): BuildOrder[] {
  const q = f.q?.trim().toLowerCase();
  return builds.filter((b) => {
    if (f.race && b.race !== f.race) return false;
    if (f.vsRace && f.vsRace !== "any" && b.vsRace !== f.vsRace && b.vsRace !== "any") return false;
    if (q) {
      const hay = [b.title, b.summary, b.author, ...b.tags].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export async function getFeaturedBuild(): Promise<BuildOrder | undefined> {
  const builds = await getBuilds();
  return builds.find((b) => b.featured);
}

export async function getBuildBySlug(slug: string): Promise<BuildOrder | undefined> {
  if (isSanityConfigured()) {
    const client = sanityClient();
    if (client) {
      try {
        const doc = await client.fetch<BuildOrder | null>(
          `*[_type == "buildOrder" && slug.current == $slug && coalesce(reviewStatus, "approved") == "approved"][0]${DETAIL_PROJECTION}`,
          { slug },
          { next: { revalidate: 300 } },
        );
        if (doc && doc.title) return doc;
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[builds] Sanity fetch failed, using fixtures -", String(err));
        }
      }
    }
  }
  return USE_FIXTURES ? FIXTURE_BUILDS.find((b) => b.slug === slug) : undefined;
}

/** Approved builds taken from a given Learn guide (usually one). */
export async function getBuildsForGuide(guideSlug: string): Promise<BuildOrder[]> {
  if (!isSanityConfigured()) return [];
  const client = sanityClient();
  if (!client) return [];
  try {
    return await client.fetch<BuildOrder[]>(
      `*[_type == "buildOrder" && guide->slug.current == $guideSlug && coalesce(reviewStatus, "approved") == "approved"] | order(_updatedAt desc) ${LIST_PROJECTION}`,
      { guideSlug },
      { next: { revalidate: 300 } },
    );
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[builds] Sanity guide-builds fetch failed -", String(err));
    }
    return [];
  }
}
