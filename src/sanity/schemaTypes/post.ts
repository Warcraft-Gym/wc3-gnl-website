import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * Blog post. Fields match the projection the frontend already queries in
 * src/lib/content/index.ts, so publishing here surfaces posts on /blog.
 */
export const post = defineType({
  name: "post",
  title: "Blog post",
  type: "document",
  fields: [
    defineField({
      name: "title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "excerpt",
      type: "text",
      rows: 3,
      description: "Short summary shown on cards and at the top of the post.",
      validation: (rule) => rule.required().max(280),
    }),
    defineField({
      name: "category",
      type: "string",
      options: {
        list: [
          { title: "News", value: "news" },
          { title: "Recap", value: "recap" },
          { title: "Guide", value: "guide" },
          { title: "Announcement", value: "announcement" },
        ],
        layout: "radio",
      },
      initialValue: "news",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "author",
      type: "string",
      initialValue: "Gym Staff",
    }),
    defineField({
      name: "publishedAt",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "readingMinutes",
      title: "Reading time (minutes)",
      type: "number",
      initialValue: 4,
      validation: (rule) => rule.min(1).max(60),
    }),
    defineField({
      name: "coverImage",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "body",
      type: "array",
      of: [defineArrayMember({ type: "block" }), defineArrayMember({ type: "image" })],
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "category", media: "coverImage" },
  },
});
