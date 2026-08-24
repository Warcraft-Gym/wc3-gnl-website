import "server-only";
import { isSanityConfigured, sanityClient } from "./sanity";
import { FIXTURE_POSTS } from "./fixtures";
import type { Post, ContentSourceName } from "./types";

export type { Post } from "./types";

const POST_PROJECTION = `{
  "slug": slug.current,
  title,
  excerpt,
  category,
  "author": coalesce(author->name, author, "Gym Staff"),
  publishedAt,
  "readingMinutes": coalesce(readingMinutes, 4),
  "coverImageUrl": coverImage.asset->url,
  "portableText": body
}`;

async function fromSanity(): Promise<Post[] | null> {
  const client = sanityClient();
  if (!client) return null;
  try {
    return await client.fetch<Post[]>(
      `*[_type == "post" && defined(slug.current)] | order(publishedAt desc) ${POST_PROJECTION}`,
      {},
      { next: { revalidate: 300 } },
    );
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[content] Sanity fetch failed, using fixtures —", String(err));
    }
    return null;
  }
}

export async function getPosts(): Promise<{
  posts: Post[];
  source: ContentSourceName;
}> {
  if (isSanityConfigured()) {
    const live = await fromSanity();
    if (live && live.length) return { posts: live, source: "sanity" };
  }
  const posts = [...FIXTURE_POSTS].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  return { posts, source: "fixture" };
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  const { posts } = await getPosts();
  return posts.find((p) => p.slug === slug);
}

export async function getLatestPosts(n: number): Promise<Post[]> {
  const { posts } = await getPosts();
  return posts.slice(0, n);
}
