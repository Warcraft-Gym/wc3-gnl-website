import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * A Learn guide (race/topic strategy article). Category values match the
 * frontend's fixed categories in src/lib/learn/data.ts, so guides map onto the
 * existing /learn/[category] pages and icons. This is the port target for the
 * guides on the live Learn section.
 */
export const guide = defineType({
  name: "guide",
  title: "Learn guide",
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
      name: "category",
      type: "string",
      options: {
        list: [
          { title: "New & returning players", value: "new-players" },
          { title: "Human", value: "human" },
          { title: "Night Elf", value: "night-elf" },
          { title: "Orc", value: "orc" },
          { title: "Undead", value: "undead" },
          { title: "Creep Routes", value: "creep-routes" },
          { title: "Game Mechanics", value: "mechanics" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "level",
      type: "string",
      options: {
        list: [
          { title: "Beginner", value: "beginner" },
          { title: "Intermediate", value: "intermediate" },
          { title: "Advanced", value: "advanced" },
        ],
        layout: "radio",
      },
      initialValue: "beginner",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "excerpt",
      type: "text",
      rows: 3,
      validation: (rule) => rule.required().max(280),
    }),
    defineField({
      name: "readingMinutes",
      title: "Reading time (minutes)",
      type: "number",
      initialValue: 4,
      validation: (rule) => rule.min(1).max(60),
    }),
    defineField({
      name: "publishedAt",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
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
        defineArrayMember({ type: "image" }),
        defineArrayMember({
          type: "object",
          name: "youtube",
          title: "Video",
          fields: [
            defineField({
              name: "url",
              type: "url",
              title: "Video URL (YouTube / Vimeo)",
            }),
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
      description: "Source post id, for re-running the migration idempotently.",
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "category" },
  },
});
