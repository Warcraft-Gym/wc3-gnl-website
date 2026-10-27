import type { NextConfig } from "next";
import { LEGACY_REDIRECTS } from "./src/lib/legacy-redirects";

/**
 * Browser cache for the artwork in `public/`.
 *
 * Vercel serves `public/` with `max-age=0, must-revalidate`, so a returning
 * visitor re-requests every icon on every page view. A build page alone pulls
 * sixteen `/wc3-icons` files, and each revalidation is a billed CDN request
 * even when it comes back 304. CDN requests were the largest line on the
 * usage bill (about a third), so this is the biggest lever that costs nothing
 * in freshness that matters.
 *
 * No `immutable`: filenames here are not content-hashed, and a corrected icon
 * (the Murloc casing fix, say) has to reach people eventually. A week, then a
 * day of stale-while-revalidate so an expired icon still paints instantly.
 */
const ART_CACHE = "public, max-age=604800, stale-while-revalidate=86400";

/** Art that changes on a schedule: minimaps when the ladder pool rotates,
 *  team logos each season. A day, so a rotation shows up by tomorrow. */
const SEASONAL_ART_CACHE = "public, max-age=86400, stale-while-revalidate=604800";

const STATIC_ART = [
  "wc3-icons", "flags", "achievementIcons", "factions", "map-icons",
  "logo", "keyart", "graphics", "tools", "overlay", "og", "training-grounds",
];
const SEASONAL_ART = ["maps", "team-logos"];

/** The site icons and the manifest, which every page links: without this a
 *  browser re-checks each of them on almost every page view, about 4,300 CDN
 *  requests a day in October 2026, nearly all answered 304. */
const SITE_ICONS = [
  "/favicon.ico", "/icon.png", "/apple-icon.png", "/icon-192.png",
  "/icon-maskable-512.png", "/manifest.webmanifest",
];

const nextConfig: NextConfig = {
  experimental: {
    // How long the browser's in-memory router cache reuses a page it already
    // has, so going back to one costs no request. Prefetched and static pages
    // (most of this site) half an hour, the rest five minutes; content changes
    // a few times a week, and a reload always fetches fresh.
    staleTimes: { static: 1800, dynamic: 300 },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io" }],
    // How long Vercel's edge keeps an optimised image: a week, the same as the
    // browser cache of the art behind it. The edge answers with an `Age` that
    // counts from when it made the image, and a browser takes that off
    // `max-age`. At a month every image older than a week arrived stale and
    // was re-checked on each page view (October 2026). Sanity pictures and the
    // faction icons never come through here (see `src/components/ui/Image.tsx`).
    minimumCacheTTL: 604_800,
  },
  async redirects() {
    return [
      // Hand-written rules first: first match wins, so these override any
      // legacy entry with the same source.
      { source: "/standings", destination: "/gnl/standings", permanent: true },
      { source: "/learn/guide/reading-creep-camps-and-drops", destination: "/learn/guide/understanding-creep-routes", permanent: true },
      { source: "/schedule", destination: "/gnl/schedule", permanent: true },
      { source: "/teams", destination: "/gnl/teams", permanent: true },
      { source: "/teams/:slug", destination: "/gnl/teams/:slug", permanent: true },
      { source: "/players", destination: "/gnl/teams", permanent: true },
      { source: "/gnl/leaderboard", destination: "/gnl/teams", permanent: true },
      { source: "/about-wc3-gym", destination: "/about", permanent: true },
      { source: "/rules", destination: "/gnl/rules", permanent: true },
      // 173 URLs indexed on the WordPress site this replaced — see
      // src/lib/legacy-redirects.ts.
      ...LEGACY_REDIRECTS,
    ];
  },
  async headers() {
    const rule = (dir: string, value: string) => ({
      source: `/${dir}/:path*`,
      headers: [{ key: "Cache-Control", value }],
    });
    return [
      ...STATIC_ART.map((dir) => rule(dir, ART_CACHE)),
      ...SEASONAL_ART.map((dir) => rule(dir, SEASONAL_ART_CACHE)),
      ...SITE_ICONS.map((source) => ({ source, headers: [{ key: "Cache-Control", value: ART_CACHE }] })),
    ];
  },
};

export default nextConfig;
