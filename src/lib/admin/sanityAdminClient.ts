import "server-only";
import { createClient, type SanityClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "@/sanity/env";

/**
 * Write-capable Sanity client for the admin CMS. Uses SANITY_API_WRITE_TOKEN
 * (Editor scope, same token as src/lib/builds/submit.ts) and `perspective:
 * "raw"` so it can read drafts by id. Server-only: importing this from a
 * client component would leak the write token into the bundle.
 */

const token = process.env.SANITY_API_WRITE_TOKEN;

export function isAdminSanityConfigured(): boolean {
  return Boolean(projectId && token);
}

let cached: SanityClient | null = null;

export function sanityAdminClient(): SanityClient {
  if (!token) throw new Error("SANITY_API_WRITE_TOKEN is not configured");
  if (!cached) {
    cached = createClient({ projectId, dataset, apiVersion, token, useCdn: false, perspective: "raw" });
  }
  return cached;
}
