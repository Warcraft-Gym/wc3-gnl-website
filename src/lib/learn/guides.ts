import "server-only";
import { isSanityConfigured, sanityClient } from "@/lib/content/sanity";
import { GUIDES as FIXTURE_GUIDES } from "./data";
import type { Guide, LearnCategoryId } from "./data";

/**
 * Guide data access. Reads `guide` documents from Sanity and falls back to the
 * bundled fixtures. Lists fetch metadata only (no body) — fetching all bodies
 * at once exceeds Next.js' 2MB fetch-cache limit. The detail view fetches a
 * single guide's body by slug.
 */

const LIST_PROJECTION = `{
  "slug": slug.current,
  title,
  category,
  level,
  excerpt,
  "minutes": coalesce(readingMinutes, 4),
  publishedAt,
  coverImage
}`;

const DETAIL_PROJECTION = `{
  "slug": slug.current,
  title,
  category,
  level,
  excerpt,
  "minutes": coalesce(readingMinutes, 4),
  publishedAt,
  coverImage,
  body
}`;

function byDateDesc(a: Guide, b: Guide) {
  return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
}

async function listFromSanity(): Promise<Guide[] | null> {
  const client = sanityClient();
  if (!client) return null;
  try {
    return await client.fetch<Guide[]>(
      `*[_type == "guide" && defined(slug.current)] | order(publishedAt desc) ${LIST_PROJECTION}`,
      {},
      { next: { revalidate: 300 } },
    );
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[learn] Sanity guide list failed, using fixtures —", String(err));
    }
    return null;
  }
}

export async function getGuides(): Promise<Guide[]> {
  if (isSanityConfigured()) {
    const live = await listFromSanity();
    if (live && live.length) return live;
  }
  return [...FIXTURE_GUIDES].sort(byDateDesc);
}

export async function getGuidesByCategory(
  id: LearnCategoryId,
): Promise<Guide[]> {
  const guides = await getGuides();
  return guides.filter((g) => g.category === id).sort(byDateDesc);
}

export async function getLatestGuides(n: number): Promise<Guide[]> {
  const guides = await getGuides();
  return guides.slice(0, n);
}

export async function getGuideBySlug(slug: string): Promise<Guide | undefined> {
  if (isSanityConfigured()) {
    const client = sanityClient();
    if (client) {
      try {
        const doc = await client.fetch<Guide | null>(
          `*[_type == "guide" && slug.current == $slug][0]${DETAIL_PROJECTION}`,
          { slug },
          { next: { revalidate: 300 } },
        );
        if (doc && doc.title) return doc;
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[learn] Sanity guide fetch failed, using fixtures —", String(err));
        }
      }
    }
  }
  return FIXTURE_GUIDES.find((g) => g.slug === slug);
}
