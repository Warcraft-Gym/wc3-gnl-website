/**
 * The cache tag every Sanity read carries.
 *
 * `revalidatePath` throws away a rendered page; it does not touch the data
 * cache behind it. So a webhook that only called `revalidatePath` would make
 * Next re-render the page and feed it the same `revalidate: 300` fetch
 * response it had before: the page is faithfully rebuilt from stale content,
 * and the edit does not appear until the window expires on its own.
 *
 * That is not hypothetical. An edit to the King of the Hill page showed
 * `x-vercel-cache: HIT, age: 24` in production, proving the page had just
 * been regenerated, while still rendering the previous copy.
 *
 * Tagging every Sanity fetch with this and calling `revalidateTag` in the
 * webhook purges the data as well as the page.
 *
 * One tag rather than one per document type: content edits are rare, the
 * queries are small, and a single tag cannot drift out of step with the
 * types a query actually reads. The `revalidate` window stays as a backstop
 * for the case where the webhook never arrives.
 */
export const SANITY_TAG = "sanity";

/** Fetch options for a Sanity read: tagged, with a 5 minute backstop. */
export const sanityCache = { next: { revalidate: 300, tags: [SANITY_TAG] } } as const;
