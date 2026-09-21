import "server-only";
import { isSanityConfigured, sanityClient } from "@/lib/content/sanity";
import { FIXTURE_MAPS } from "./fixtures";
import type { CreepMap } from "./types";

/**
 * Creep-map data access. Reads published `creepMap` documents from Sanity
 * (editors publish these with `scripts/creep-maps/publish.mjs` after review
 * of the auto-nudged camp positions). The bundled fixtures — built from
 * `maps/*.json` — are used only in development when Sanity is unreachable
 * or has no maps; production always shows exactly what Sanity has. Mirrors
 * `src/lib/builds/builds.ts`.
 */

const USE_FIXTURES = process.env.NODE_ENV !== "production";

const MAP_PROJECTION = `{
  "slug": slug.current,
  name, mapVersion, w3cMapId, bounds, image, camps, starts, mines, shops,
  "minimapUrl": minimap.asset->url,
  sourceFile, generatedAt
}`;

async function listFromSanity(): Promise<CreepMap[] | null> {
  const client = sanityClient();
  if (!client) return null;
  try {
    return await client.fetch<CreepMap[]>(
      `*[_type == "creepMap" && defined(slug.current)] | order(name asc) ${MAP_PROJECTION}`,
      {},
      { next: { revalidate: 300 } },
    );
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[creep-routes] Sanity map list failed, using fixtures -", String(err));
    }
    return null;
  }
}

export async function getCreepMaps(): Promise<CreepMap[]> {
  if (isSanityConfigured()) {
    const live = await listFromSanity();
    if (live && (live.length || !USE_FIXTURES)) return live;
    if (!USE_FIXTURES) return [];
  }
  return USE_FIXTURES ? [...FIXTURE_MAPS] : [];
}

export async function getCreepMapBySlug(slug: string): Promise<CreepMap | undefined> {
  if (isSanityConfigured()) {
    const client = sanityClient();
    if (client) {
      try {
        const doc = await client.fetch<CreepMap | null>(
          `*[_type == "creepMap" && slug.current == $slug][0]${MAP_PROJECTION}`,
          { slug },
          { next: { revalidate: 300 } },
        );
        if (doc && doc.name) return doc;
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[creep-routes] Sanity map fetch failed, using fixtures -", String(err));
        }
      }
    }
  }
  return USE_FIXTURES ? FIXTURE_MAPS.find((m) => m.slug === slug) : undefined;
}
