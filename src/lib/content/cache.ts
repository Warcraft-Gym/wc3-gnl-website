/**
 * Cache tags for Sanity reads, one per document type.
 *
 * Two things had to be true at once. `revalidatePath` alone does not work:
 * it throws away the rendered page but leaves the data cache behind it, so
 * Next re-renders and is handed the same response it already had, and the
 * page is faithfully rebuilt from stale content. And a single tag for all of
 * Sanity does work, but it purges everything on any edit, so changing one
 * build order rewrites the cache entry for every page on the site.
 *
 * So the tag names the document type, and a query carries a tag for every
 * type it reads, **including the ones it dereferences**. A creep route page
 * shows its map's name and its companion build's title, so editing a
 * `creepMap` has to purge creep routes as well as maps. Getting that wrong
 * is how stale content comes back, so the couplings are written out rather
 * than inferred.
 */

/** Document types that exist. Kept beside the tags so an unlisted type is
 *  obvious rather than silently untagged. */
export type SanityType =
  | "post" | "guide" | "buildOrder" | "tool"
  | "creepMap" | "creepRoute" | "gnlRules" | "kothPage";

export const sanityTag = (type: SanityType) => `sanity:${type}`;

/**
 * How long a Sanity read survives when nothing purges it: a day.
 *
 * This is a backstop, not the mechanism. Edits reach the site within seconds
 * two ways: the Studio's Publish button calls `/api/revalidate/studio`, and
 * the Sanity webhook calls `/api/revalidate`. Either purges the edited type's
 * tag.
 *
 * Every page regenerates once per backstop window while it gets traffic, and
 * that is what Vercel bills as ISR writes. At an hour the site wrote about
 * 32,000 entries a day, and at 5 minutes for builds and routes about 72,000
 * (October 2026); Vercel's free plan allows about 6,600 a day. A day keeps
 * the whole site to roughly one regeneration per page per day.
 */
export const SANITY_REVALIDATE = 86400;

/** Fetch options for a Sanity read. Pass every type the query touches. */
export function sanityCache(...types: SanityType[]) {
  return { next: { revalidate: SANITY_REVALIDATE, tags: types.map(sanityTag) } } as const;
}
