/**
 * Canonical site identity. Every absolute URL in metadata, the sitemap,
 * robots, the share cards and the structured data goes through here, so a
 * preview deployment still declares the site's own domain as canonical.
 *
 * The order matters. A share card only appears when the crawler can fetch
 * the URL in the tag, so the origin must be a host that answers today:
 *   1. NEXT_PUBLIC_SITE_URL, for local testing and a staging host.
 *   2. VERCEL_PROJECT_PRODUCTION_URL, the project's production host. It is
 *      the custom domain once one is attached, and the *.vercel.app host
 *      until then, so links keep their preview while the domain is set up.
 *   3. The domain the site is headed for, for a build outside Vercel.
 * Plain `next dev` uses localhost.
 */

const PRODUCTION_URL = "https://warcraft3.gym";

/** Vercel sends a bare host, with no scheme. */
const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : undefined;

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "production" ? (vercelProductionUrl ?? PRODUCTION_URL) : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE_NAME = "Warcraft 3 Gym";
export const SITE_TAGLINE = "Learn Warcraft III and compete in the GNL";
export const SITE_DESCRIPTION =
  "Free Warcraft III guides and build orders for every race, a friendly Discord with coaching, and the Gym Newbie League: a community team league with weekly best-of-three series.";

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
