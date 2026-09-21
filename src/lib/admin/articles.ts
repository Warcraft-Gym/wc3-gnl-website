import "server-only";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { sanityAdminClient } from "./sanityAdminClient";
import { slugify } from "@/lib/utils";
import { PATHS } from "@/app/api/revalidate/route";

/**
 * CRUD for the admin CMS. Only "post" and "guide" for now. Callers always
 * work with the *base* document id (no "drafts." prefix) — these helpers
 * translate to/from Sanity's drafts.<id> convention internally, the same
 * convention src/lib/builds/submit.ts already uses.
 */

export type ArticleType = "post" | "guide";
type Doc = Record<string, unknown> & { _id: string; _type: string };

const draftId = (id: string) => (id.startsWith("drafts.") ? id : `drafts.${id}`);
const baseId = (id: string) => (id.startsWith("drafts.") ? id.slice("drafts.".length) : id);

export async function listArticles(type: ArticleType) {
  const client = sanityAdminClient();
  const docs = await client.fetch<Doc[]>(
    `*[_type == $type] | order(coalesce(publishedAt, _createdAt) desc) {
      _id, title, "slug": slug.current, excerpt, publishedAt, category, level, author
    }`,
    { type },
  );

  // A doc can exist as both drafts.<id> and <id> at once; show one row and
  // prefer the draft (the working copy) when both exist.
  const byBase = new Map<string, { doc: Doc; hasDraft: boolean }>();
  for (const doc of docs) {
    const id = baseId(doc._id);
    const isDraft = doc._id.startsWith("drafts.");
    const existing = byBase.get(id);
    if (!existing) {
      byBase.set(id, { doc, hasDraft: isDraft });
    } else {
      existing.hasDraft = existing.hasDraft || isDraft;
      if (isDraft) existing.doc = doc;
    }
  }
  return [...byBase.values()].map(({ doc, hasDraft }) => ({ ...doc, hasDraft }));
}

export async function getArticle(type: ArticleType, id: string) {
  const client = sanityAdminClient();
  return client.fetch<Record<string, unknown> | null>(
    `*[_type == $type && _id in [$draftId, $baseId]] | order(_id desc)[0]`,
    { type, draftId: draftId(id), baseId: baseId(id) },
  );
}

export async function createDraft(type: ArticleType, data: Record<string, unknown>) {
  const client = sanityAdminClient();
  const id = randomUUID();
  const slug = (data.slug as string | undefined) || slugify(String(data.title ?? ""));

  await client.create({
    _id: draftId(id),
    _type: type,
    ...data,
    slug: { _type: "slug", current: slug },
  });
  return { id, slug };
}

export async function updateDraft(type: ArticleType, id: string, patch: Record<string, unknown>) {
  const client = sanityAdminClient();
  const target = draftId(id);
  const { slug, ...rest } = patch;
  const setPayload: Record<string, unknown> = { ...rest };
  if (slug) setPayload.slug = { _type: "slug", current: slug as string };

  const existingId = await client.fetch<string | null>(`*[_id == $id][0]._id`, { id: target });
  if (existingId) {
    await client.patch(target).set(setPayload).commit();
  } else {
    // First edit of a published doc: fork it into a draft rather than
    // editing the live document directly.
    const published = await client.getDocument(baseId(id));
    await client.createOrReplace({
      ...(published ?? { _type: type }),
      ...setPayload,
      _id: target,
    } as unknown as Parameters<typeof client.createOrReplace>[0]);
  }
  return { id };
}

export async function publishArticle(type: ArticleType, id: string) {
  const client = sanityAdminClient();
  const from = draftId(id);
  const to = baseId(id);

  const draft = await client.getDocument(from);
  if (!draft) throw new Error("No draft to publish");

  await client.transaction().createOrReplace({ ...draft, _id: to }).delete(from).commit();

  const slug = (draft as { slug?: { current?: string } }).slug?.current;
  for (const path of PATHS[type]?.(slug) ?? []) revalidatePath(path);
  return { id: to, slug };
}
