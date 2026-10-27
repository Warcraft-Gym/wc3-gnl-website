/**
 * The `public/` images that skip `/_next/image` and load as the file itself.
 *
 * Vercel keeps an optimised image at its edge for as long as `minimumCacheTTL`
 * and answers with an `Age` header that counts from when it was made. A browser
 * subtracts that age from `max-age`, so an icon the edge made three weeks ago
 * arrived already stale, and every page view re-checked it: in October 2026
 * the faction icons alone were about 9,600 requests a day, 6 in 10 of them 304s.
 * A file from `public/` is cached per deployment, its age stays low, and the
 * week in `next.config.ts` holds.
 *
 * Only small art that is compressed already: the race icons and crests are
 * 9 to 48 KB, which the optimiser cannot shrink by much. Banners and key art
 * stay optimised, since a phone should not download a 3840-pixel picture.
 * Plain JS so `node --test` runs `served-as-is.test.mjs`.
 */

const AS_IS = /^\/factions\/(large\/)?[a-z]+\.(png|webp)$/;

/** Whether `src` loads as the file itself, not through `/_next/image`. */
export function servedAsIs(src) {
  return typeof src === "string" && AS_IS.test(src);
}
