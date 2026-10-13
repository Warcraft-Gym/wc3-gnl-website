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

/**
 * Shorter backstops for the types the public submits and editors approve.
 * An approval is the one edit someone sits and waits to see, so when the
 * webhook misses it, an hour reads as "approving is broken". Five minutes
 * matches the CDN cache their JSON APIs already carry (`s-maxage=300`), and
 * only these lists and pages pay the extra rewrites, not the whole site.
 */
export const SANITY_REVALIDATE_BY_TYPE: Partial<Record<SanityType, number>> = {
  buildOrder: 300,
  creepRoute: 300,
};

/** Fetch options for a Sanity read. Pass every type the query touches; the
 *  read lives as long as the shortest backstop among them. */
export function sanityCache(...types: SanityType[]) {
  const revalidate = Math.min(SANITY_REVALIDATE, ...types.map((t) => SANITY_REVALIDATE_BY_TYPE[t] ?? SANITY_REVALIDATE));
  return { next: { revalidate, tags: types.map(sanityTag) } } as const;
}
