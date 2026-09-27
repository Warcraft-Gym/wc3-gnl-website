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
  | "creepMap" | "creepRoute" | "gnlRules" | "kothPage" | "kothResult";

export const sanityTag = (type: SanityType) => `sanity:${type}`;

/**
 * How long a Sanity read survives without a webhook.
 *
 * This is a backstop, not the mechanism: edits arrive through
 * `revalidateTag` within seconds. It used to be 5 minutes, which meant every
 * cached page rewrote itself twelve times an hour whether or not anything
 * had changed. An hour is long enough to cut that by an order of magnitude
 * and short enough that a missed webhook is a nuisance rather than a wrong
 * page for a day.
 */
export const SANITY_REVALIDATE = 3600;

/** Fetch options for a Sanity read. Pass every type the query touches. */
export function sanityCache(...types: SanityType[]) {
  return { next: { revalidate: SANITY_REVALIDATE, tags: types.map(sanityTag) } } as const;
}
