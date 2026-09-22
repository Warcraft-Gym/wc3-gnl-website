import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "next-sanity";
import { slugify } from "@/lib/utils";
import { toCreepRouteDraft, type SubmissionInput } from "./submission";
import { apiVersion, dataset, projectId } from "@/sanity/env";

/**
 * Writes a public creep-route submission to Sanity as a *draft* `creepRoute`
 * document — invisible to the site, shows up under "Pending review" in the
 * Studio, same review gate and write-client pattern as
 * `src/lib/builds/submit.ts`'s `createBuildDraft`.
 *
 * Needs SANITY_API_WRITE_TOKEN (Editor scope, same token build submissions
 * use). Never exposed to the browser.
 */

const token = process.env.SANITY_API_WRITE_TOKEN;

export function canAcceptSubmissions(): boolean {
  return Boolean(projectId && token);
}

/** `scripts/creep-maps/publish.mjs`'s deterministic id, `creepMap-<slug>`.
 *  Hyphen, not dot: a dot makes the document private to token-holders.
 *  A route can reference a map before it has been published (see the
 *  handoff for the "map not yet in Sanity" case): the reference simply
 *  points at the id the map will have once `publish.mjs` runs for that
 *  slug, so the Studio shows a dangling reference rather than the draft
 *  being lost or blocked. */
function mapDocId(slug: string): string {
  return `creepMap-${slug}`;
}

export async function createCreepRouteDraft(valid: SubmissionInput): Promise<{ id: string; slug: string }> {
  if (!projectId || !token) throw new Error("Submissions are not configured");

  const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false });

  // The companion build (if any) has no deterministic id like a creepMap
  // does, so it is resolved by slug at write time; a lookup failure just
  // means the draft ships without that link rather than failing the whole
  // submission.
  let buildDocId: string | undefined;
  if (valid.build) {
    try {
      buildDocId =
        (await client.fetch<string | null>(`*[_type == "buildOrder" && slug.current == $slug][0]._id`, {
          slug: valid.build,
        })) ?? undefined;
    } catch (err) {
      console.error("[creep-routes] companion build lookup failed", err);
    }
  }

  const slug = `${slugify(valid.title)}-${randomUUID().slice(0, 4)}`;
  const draft: Record<string, unknown> = {
    ...toCreepRouteDraft(valid, mapDocId(valid.map), buildDocId),
    slug: { _type: "slug", current: slug },
  };

  await client.create(draft as { _type: string; _id?: string });
  return { id: String(draft._id), slug };
}
