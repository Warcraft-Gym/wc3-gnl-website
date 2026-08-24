import "server-only";
import { createClient, type SanityClient } from "next-sanity";

/**
 * Sanity wiring. Optional: only active when the project env vars are present.
 * This keeps the blog fully functional on fixtures during local dev / previews
 * without Sanity credentials.
 *
 * Env:
 *   NEXT_PUBLIC_SANITY_PROJECT_ID
 *   NEXT_PUBLIC_SANITY_DATASET       (default: "production")
 *   SANITY_API_VERSION               (default: "2024-10-01")
 */

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
const apiVersion = process.env.SANITY_API_VERSION ?? "2024-10-01";

export function isSanityConfigured(): boolean {
  return Boolean(projectId);
}

let cached: SanityClient | null = null;

export function sanityClient(): SanityClient | null {
  if (!projectId) return null;
  if (!cached) {
    cached = createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: true,
      perspective: "published",
    });
  }
  return cached;
}
