/**
 * Canonical site identity. The URL comes from NEXT_PUBLIC_SITE_URL when set
 * (use it once the custom domain is live), else Vercel's production URL for
 * the project, else localhost. Every absolute URL in metadata, the sitemap,
 * robots and structured data goes through here.
 */

const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
const fromVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const SITE_URL = (
  fromEnv ?? (fromVercel ? `https://${fromVercel}` : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE_NAME = "Warcraft 3 Gym";
export const SITE_TAGLINE = "Learn Warcraft III and compete in the GNL";
export const SITE_DESCRIPTION =
  "Free Warcraft III guides and build orders for every race, a friendly Discord with coaching, and the Gym Newbie League: a community team league with weekly best-of-three series.";

/** Default share image: the homepage key art. 1200x630 is what every network wants. */
export const DEFAULT_OG_IMAGE = "/opengraph-image.png";

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
