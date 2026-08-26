import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io" }],
  },
  async redirects() {
    return [
      { source: "/standings", destination: "/gnl/standings", permanent: true },
      { source: "/schedule", destination: "/gnl/schedule", permanent: true },
      { source: "/teams", destination: "/gnl/teams", permanent: true },
      { source: "/teams/:slug", destination: "/gnl/teams/:slug", permanent: true },
      { source: "/players", destination: "/gnl/leaderboard", permanent: true },
      { source: "/about", destination: "/gnl/about", permanent: true },
      { source: "/rules", destination: "/gnl/rules", permanent: true },
    ];
  },
};

export default nextConfig;
