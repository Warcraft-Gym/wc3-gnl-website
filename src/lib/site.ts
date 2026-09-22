/**
 * Canonical site identity. The site lives at https://warcraft3.gym; every
 * absolute URL in metadata, the sitemap, robots and structured data goes
 * through here, so preview deployments still declare the real domain as
 * canonical. NEXT_PUBLIC_SITE_URL overrides it (local testing, a staging
 * host); plain `next dev` uses localhost.
 */

const PRODUCTION_URL = "https://warcraft3.gym";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "production" ? PRODUCTION_URL : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE_NAME = "Warcraft 3 Gym";
export const SITE_TAGLINE = "Learn Warcraft III and compete in the GNL";
export const SITE_DESCRIPTION =
  "Free Warcraft III guides and build orders for every race, a friendly Discord with coaching, and the Gym Newbie League: a community team league with weekly best-of-three series.";

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
