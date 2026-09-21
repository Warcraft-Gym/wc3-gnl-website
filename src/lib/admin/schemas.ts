import { z } from "zod";

/**
 * Validation for the admin CMS forms (post/guide). Mirrors the constraints
 * in src/sanity/schemaTypes/{post,guide}.ts — keep both in sync if a schema
 * field changes.
 */

export const POST_CATEGORIES = ["news", "recap", "guide", "announcement"] as const;
export const GUIDE_CATEGORIES = [
  "new-players",
  "human",
  "night-elf",
  "orc",
  "undead",
  "creep-routes",
  "mechanics",
] as const;
export const LEVELS = ["beginner", "intermediate", "advanced"] as const;

const spanSchema = z.object({
  _type: z.literal("span"),
  _key: z.string(),
  text: z.string(),
  marks: z.array(z.string()).default([]),
});

const markDefSchema = z.object({
  _type: z.literal("link"),
  _key: z.string(),
  href: z.string().refine((v) => /^https?:\/\//.test(v), "Must start with http(s)://"),
});

const blockSchema = z.object({
  _type: z.literal("block"),
  _key: z.string(),
  style: z.enum(["normal", "h2", "h3", "blockquote"]).default("normal"),
  listItem: z.enum(["bullet", "number"]).optional(),
  level: z.number().int().min(1).max(4).optional(),
  markDefs: z.array(markDefSchema).default([]),
  children: z.array(spanSchema).min(1),
});

const imageBlockSchema = z.object({
  _type: z.literal("image"),
  _key: z.string(),
  asset: z.object({ _type: z.literal("reference"), _ref: z.string() }),
  alt: z.string().optional(),
  caption: z.string().optional(),
});

const youtubeBlockSchema = z.object({
  _type: z.literal("youtube"),
  _key: z.string(),
  url: z.string().optional(),
});

/** The subset of Portable Text the admin editor and PortableBody support. */
export const portableTextSchema = z.array(
  z.discriminatedUnion("_type", [blockSchema, imageBlockSchema, youtubeBlockSchema]),
);

const baseArticleFields = {
  title: z.string().trim().min(1, "Title is required").max(120, "Keep it under 120 characters"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(96, "Max 96 characters")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only"),
  excerpt: z.string().trim().min(1, "Excerpt is required").max(280, "Max 280 characters"),
  readingMinutes: z.coerce.number().int().min(1).max(60).default(4),
  publishedAt: z.string().trim().min(1, "Publish date is required"),
  coverImageRef: z.string().trim().optional(),
  body: portableTextSchema.default([]),
};

export const postSchema = z.object({
  ...baseArticleFields,
  category: z.enum(POST_CATEGORIES).default("news"),
  author: z.string().trim().max(60).optional(),
});

export const guideSchema = z.object({
  ...baseArticleFields,
  category: z.enum(GUIDE_CATEGORIES),
  level: z.enum(LEVELS).default("beginner"),
});

export type PostInput = z.infer<typeof postSchema>;
export type GuideInput = z.infer<typeof guideSchema>;

export type FieldErrors = Record<string, string>;

export function flattenErrors(err: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
