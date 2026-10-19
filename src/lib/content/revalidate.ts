import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { sanityTag, type SanityType } from "@/lib/content/cache";

/**
 * Which pages render each Sanity document type, and how to purge them.
 *
 * Shared by the two ways an edit reaches the site: the Sanity webhook
 * (`/api/revalidate`) and the Studio's own Publish button
 * (`/api/revalidate/studio`). Both must clear exactly the same pages, so the
 * list lives here once.
 */
export const PATHS: Record<string, (slug?: string) => string[]> = {
  buildOrder: (slug) => [
    "/learn/builds",
    ...(slug ? [`/learn/builds/${slug}`] : []),
    "/learn/human", "/learn/orc", "/learn/night-elf", "/learn/undead",
    "/",
    "/api/builds",
    ...(slug ? [`/api/builds/${slug}`] : []),
  ],
  post: (slug) => ["/blog", ...(slug ? [`/blog/${slug}`] : []), "/"],
  tool: () => ["/tools"],
  // The two singletons. Neither was listed, so editing the rulebook or the
  // KotH page left the page it renders stale until the ISR window rolled.
  gnlRules: () => ["/gnl/rules"],
  kothPage: () => ["/king-of-the-hill", "/"],
  guide: (slug) => ["/learn", ...(slug ? [`/learn/guide/${slug}`] : []), "/"],
  creepRoute: (slug) => [
    "/learn/creep-routes",
    ...(slug ? [`/learn/creep-routes/${slug}`] : []),
    "/",
    "/api/creep-routes",
    ...(slug ? [`/api/creep-routes/${slug}`] : []),
  ],
  creepMap: (slug) => [
    "/learn/creep-routes",
    "/api/creep-maps",
    ...(slug ? [`/api/creep-maps/${slug}`] : []),
  ],
};

/**
 * Purges one document type: its cache tag first, then the pages that render it.
 * Returns the paths it purged, or `null` for a type no page renders.
 *
 * The tag first: `revalidatePath` only throws away the rendered page, so
 * without this Next re-renders and is handed the same cached Sanity response
 * it had before, rebuilding the page faithfully from stale content. Purging the
 * data is what makes an edit actually show.
 *
 * Only this document's type, not all of Sanity. Every query carries a tag for
 * each type it reads, dereferences included, so a creep route whose page shows
 * its map's name is still purged when that map changes, without rewriting the
 * cache for every guide and post on the site.
 *
 * "max" expires the tag whatever cache life the entry was written with; Next 16
 * deprecated the single-argument form.
 */
export function purgeType(type: string, slug?: string): string[] | null {
  const paths = PATHS[type]?.(slug);
  if (!paths) return null;
  revalidateTag(sanityTag(type as SanityType), "max");
  for (const p of paths) revalidatePath(p);
  return paths;
}
