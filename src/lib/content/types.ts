/**
 * Editorial content model. Decoupled from any single CMS so the source can be
 * Sanity today and Payload / a Flask blog table later without touching the UI.
 */
export type PostCategory = "news" | "recap" | "guide" | "announcement";

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  category: PostCategory;
  author: string;
  publishedAt: string;
  readingMinutes: number;
  coverImageUrl?: string;
  /** Portable Text blocks (Sanity). Rendered when present. */
  portableText?: unknown[];
  /** Plain paragraph fallback (fixtures / simple sources). */
  paragraphs?: string[];
};

export type ContentSourceName = "sanity" | "fixture";
