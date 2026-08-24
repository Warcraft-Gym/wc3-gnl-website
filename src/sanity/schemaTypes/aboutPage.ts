import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * The GNL About page. A singleton — the frontend reads the first document.
 * Structured fields keep the designed card/step layout while making the copy
 * editable in the Studio.
 */
export const aboutPage = defineType({
  name: "aboutPage",
  title: "About page",
  type: "document",
  fields: [
    defineField({
      name: "kicker",
      type: "string",
      initialValue: "Gym Newbie League",
    }),
    defineField({
      name: "title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "lead",
      type: "text",
      rows: 3,
      description: "Short intro shown under the title.",
    }),
    defineField({
      name: "intro",
      title: "Intro paragraphs",
      type: "array",
      of: [defineArrayMember({ type: "block" })],
    }),
    defineField({
      name: "benefits",
      title: "Why play",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({ name: "title", type: "string" }),
            defineField({ name: "body", type: "text", rows: 3 }),
          ],
          preview: { select: { title: "title", subtitle: "body" } },
        }),
      ],
      validation: (rule) => rule.max(3),
      description: "Up to three benefit cards.",
    }),
    defineField({
      name: "steps",
      title: "How a season works",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({ name: "title", type: "string" }),
            defineField({ name: "body", type: "text", rows: 3 }),
          ],
          preview: { select: { title: "title", subtitle: "body" } },
        }),
      ],
    }),
    defineField({
      name: "cadence",
      title: "Season cadence",
      type: "array",
      of: [defineArrayMember({ type: "block" })],
    }),
  ],
  preview: {
    select: { title: "title" },
    prepare: ({ title }) => ({ title: title ?? "About page" }),
  },
});
