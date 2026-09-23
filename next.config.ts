import type { NextConfig } from "next";
import { LEGACY_REDIRECTS } from "./src/lib/legacy-redirects";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io" }],
  },
  async redirects() {
    return [
      // Hand-written rules first: first match wins, so these override any
      // legacy entry with the same source.
      { source: "/standings", destination: "/gnl/standings", permanent: true },
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
};

export default nextConfig;
