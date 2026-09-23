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
      of: [
        defineArrayMember({ type: "block" }),
        defineArrayMember({
          type: "image",
          // Without this an editor has no way to describe a body image, so
          // every one of them renders `alt=""` — announced to a screen
          // reader as decorative, which for a diagram in a guide means the
          // content simply is not there. Optional on purpose: a genuinely
          // decorative image should keep an empty alt rather than be given
          // filler text.
          fields: [
            defineField({
              name: "alt",
              type: "string",
              title: "Alt text",
              description:
                "What the image shows, for screen readers and when it fails to load. Leave blank only if it is decorative.",
            }),
          ],
        }),
        defineArrayMember({
          type: "object",
          name: "youtube",
          title: "Video",
          fields: [
            defineField({ name: "url", type: "url", title: "Video URL" }),
          ],
          preview: {
            select: { url: "url" },
            prepare: ({ url }) => ({ title: "Video", subtitle: url }),
          },
        }),
      ],
    }),
    defineField({
      name: "legacyId",
      title: "Legacy WordPress ID",
      type: "string",
      readOnly: true,
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "category", media: "coverImage" },
  },
});
