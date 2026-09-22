import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "next-sanity";
import { slugify } from "@/lib/utils";
import type { BuildSubmission } from "./submission";
import { apiVersion, dataset, projectId } from "@/sanity/env";

/**
 * Writes a public submission to Sanity as a *draft* build order. Drafts are
 * invisible to the site and show up under "Pending review" in the Studio,
 * where an editor publishes (or deletes) them, that's the approval queue.
 *
 * Needs SANITY_API_WRITE_TOKEN (Editor scope). Never exposed to the browser.
 */

// Project/dataset come from the same publishable defaults the rest of the app
// uses (src/sanity/env.ts); only the token has to come from the environment.
const token = process.env.SANITY_API_WRITE_TOKEN;

export function canAcceptSubmissions(): boolean {
  return Boolean(projectId && token);
}

const key = () => randomUUID().slice(0, 12);

/** Plain text → Portable Text: one block per paragraph, blank-line separated. */
function toPortableText(text?: string) {
  if (!text) return undefined;
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
  if (!paragraphs.length) return undefined;
  return paragraphs.map((p) => ({
    _type: "block",
    _key: key(),
    style: "normal",
    markDefs: [],
    children: [{ _type: "span", _key: key(), text: p, marks: [] }],
  }));
}

export async function createBuildDraft(data: BuildSubmission): Promise<{ id: string; slug: string }> {
  if (!projectId || !token) throw new Error("Submissions are not configured");

  const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false });

  // The build this one replaces, when the author is resubmitting an update.
  // Resolved by slug; a lookup failure loses the link, not the submission —
  // a coach seeing an unlinked "replaces" claim beats a lost build.
  let supersedesDocId: string | undefined;
  if (data.supersedes) {
    try {
      supersedesDocId =
        (await client.fetch<string | null>(`*[_type == "buildOrder" && slug.current == $slug][0]._id`, {
          slug: data.supersedes,
        })) ?? undefined;
      if (!supersedesDocId) console.warn("[builds] supersedes slug matched no build:", data.supersedes);
    } catch (err) {
      console.error("[builds] supersedes lookup failed", err);
    }
  }

  const slug = `${slugify(data.title)}-${key().slice(0, 4)}`;
  const id = `drafts.${randomUUID()}`;

  await client.create({
    _id: id,
    _type: "buildOrder",
    title: data.title,
    slug: { _type: "slug", current: slug },
    race: data.race,
    vsRaces: data.vsRaces,
    difficulty: data.difficulty,
    patch: data.patch || undefined,
    tags: data.tags,
    summary: data.summary,
    author: data.author,
    authorDiscord: data.authorDiscord || undefined,
    sourceUrl: data.sourceUrl || undefined,
    supersedes: supersedesDocId ? { _type: "reference", _ref: supersedesDocId } : undefined,
    featured: false,
    reviewStatus: "pending",
    publishedAt: new Date().toISOString(),
    steps: data.steps.map((s) => ({
      _type: "step",
      _key: key(),
      time: s.time || undefined,
      supply: s.supply,
      instruction: s.instruction,
      icon: s.icon || undefined,
    })),
    description: toPortableText(data.description),
  });

  return { id, slug };
}
