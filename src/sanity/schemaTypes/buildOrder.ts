import { defineArrayMember, defineField, defineType } from "sanity";
import { GAME_ICON_OPTIONS } from "../../lib/builds/icons";

const RACES = [
  { title: "Human", value: "human" },
  { title: "Orc", value: "orc" },
  { title: "Night Elf", value: "nightelf" },
  { title: "Undead", value: "undead" },
];

/**
 * A build order: metadata + an ordered list of timed steps. Public
 * submissions arrive as drafts (see the "Pending review" list in the Studio)
 * and go live when an editor publishes them.
 */
export const buildOrder = defineType({
  name: "buildOrder",
  title: "Build order",
  type: "document",
  groups: [
    { name: "meta", title: "Details", default: true },
    { name: "steps", title: "Steps" },
    { name: "text", title: "Description" },
  ],
  fields: [
    defineField({
      name: "title",
      type: "string",
      group: "meta",
      validation: (rule) => rule.required().max(90),
    }),
    defineField({
      name: "slug",
      type: "slug",
      group: "meta",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "race",
      title: "Your race",
      type: "string",
      group: "meta",
      options: { list: RACES, layout: "radio", direction: "horizontal" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "vsRace",
      title: "Against",
      type: "string",
      group: "meta",
      options: {
        list: [...RACES, { title: "Any", value: "any" }],
        layout: "radio",
        direction: "horizontal",
      },
      initialValue: "any",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "difficulty",
      type: "string",
      group: "meta",
      options: {
        list: [
          { title: "Beginner", value: "beginner" },
          { title: "Intermediate", value: "intermediate" },
          { title: "Advanced", value: "advanced" },
        ],
        layout: "radio",
        direction: "horizontal",
      },
      initialValue: "beginner",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "patch",
      type: "string",
      group: "meta",
      description: "Game patch this was written for, e.g. 2.0.3",
      validation: (rule) => rule.max(16),
    }),
    defineField({
      name: "tags",
      type: "array",
      group: "meta",
      of: [defineArrayMember({ type: "string" })],
      options: { layout: "tags" },
    }),
    defineField({
      name: "summary",
      type: "text",
      rows: 2,
      group: "meta",
      description: "One or two lines shown in the list.",
      validation: (rule) => rule.required().max(200),
    }),
    defineField({
      name: "author",
      type: "string",
      group: "meta",
      description: "Who made the build (display name).",
      validation: (rule) => rule.required().max(60),
    }),
    defineField({
      name: "authorDiscord",
      title: "Author's Discord",
      type: "string",
      group: "meta",
      validation: (rule) => rule.max(60),
    }),
    defineField({
      name: "maintainer",
      type: "string",
      group: "meta",
      description: "Who keeps it up to date, if not the author.",
      validation: (rule) => rule.max(60),
    }),
    defineField({
      name: "sourceUrl",
      title: "Source (replay / VOD / post)",
      type: "url",
      group: "meta",
    }),
    defineField({
      name: "featured",
      title: "Build of the week",
      type: "boolean",
      group: "meta",
      initialValue: false,
      description: "Shown at the top of the build list. Only one should be on at a time.",
    }),
    defineField({
      name: "publishedAt",
      type: "datetime",
      group: "meta",
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: "steps",
      type: "array",
      group: "steps",
      validation: (rule) => rule.required().min(3),
      of: [
        defineArrayMember({
          type: "object",
          name: "step",
          fields: [
            defineField({
              name: "time",
              type: "string",
              description: "Game clock, mm:ss (optional).",
              validation: (rule) =>
                rule.regex(/^\d{1,2}:\d{2}$/, { name: "mm:ss", invert: false }).warning("Use mm:ss"),
            }),
            defineField({
              name: "supply",
              title: "Food",
              type: "number",
              validation: (rule) => rule.min(0).max(100).integer(),
            }),
            defineField({
              name: "instruction",
              type: "string",
              validation: (rule) => rule.required().max(160),
            }),
            defineField({
              name: "icon",
              type: "string",
              options: { list: GAME_ICON_OPTIONS },
            }),
          ],
          preview: {
            select: { time: "time", supply: "supply", instruction: "instruction" },
            prepare: ({ time, supply, instruction }) => ({
              title: instruction,
              subtitle: [time, supply != null ? `${supply} food` : null].filter(Boolean).join(" · "),
            }),
          },
        }),
      ],
    }),

    defineField({
      name: "description",
      type: "array",
      group: "text",
      description: "The why: when to use it, transitions, what to watch for.",
      of: [
        defineArrayMember({ type: "block" }),
        defineArrayMember({ type: "image" }),
        defineArrayMember({
          type: "object",
          name: "youtube",
          title: "Video",
          fields: [defineField({ name: "url", type: "url", title: "Video URL" })],
          preview: {
            select: { url: "url" },
            prepare: ({ url }) => ({ title: "Video", subtitle: url }),
          },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: "title", race: "race", vsRace: "vsRace", author: "author" },
    prepare: ({ title, race, vsRace, author }) => ({
      title,
      subtitle: `${race ?? "?"} vs ${vsRace ?? "any"} · ${author ?? ""}`,
    }),
  },
});
