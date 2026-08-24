/**
 * Shared Sanity configuration. projectId and dataset are publishable (not
 * secrets), so we default them to the WC3 Gym project — the embedded Studio at
 * /studio always loads, and env vars can still override per-environment.
 */
export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-08-24";

export const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

export const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "4q3xdrt2";
