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
      name: "vsRaces",
      title: "Against",
      type: "array",
      group: "meta",
      description: "Opponent races this build is written for. Leave empty for any opponent.",
      of: [defineArrayMember({ type: "string" })],
      options: { list: RACES, layout: "grid" },
      validation: (rule) => rule.unique(),
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
      name: "guide",
      title: "Companion guide",
      type: "reference",
      to: [{ type: "guide" }],
      group: "meta",
      description: "The Learn guide this build was taken from; the two pages link to each other.",
    }),
    defineField({
      name: "supersedes",
      title: "Replaces",
      type: "reference",
      to: [{ type: "buildOrder" }],
      group: "meta",
      description:
        "The build this one replaces. Set automatically when an author resubmits an updated version, and shown on the " +
        "older build so readers are sent to the current one. Approving the replacement is the moment to set the older " +
        "build's Review to Archived.",
    }),
    defineField({
      name: "reviewStatus",
      title: "Review",
      type: "string",
      group: "meta",
      options: {
        list: [
          { title: "Pending review", value: "pending" },
          { title: "Approved", value: "approved" },
          { title: "Archived", value: "archived" },
        ],
        layout: "radio",
        direction: "horizontal",
      },
      initialValue: "approved",
      description:
        "Public submissions arrive as Pending. Set to Approved once a coach has checked the build; publishing is blocked " +
        "until then. Archived hides it from the site without deleting it — use that to retract a build, or when a newer " +
        "one supersedes it.",
      validation: (rule) =>
        rule.required().custom((value) =>
          value === "pending"
            ? "Still pending review. Set Review to Approved before publishing."
            : true,
        ),
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
    select: { title: "title", race: "race", vsRaces: "vsRaces", author: "author" },
    prepare: ({ title, race, vsRaces, author }) => ({
      title,
      subtitle: `${race ?? "?"} vs ${(vsRaces as string[] | undefined)?.length ? (vsRaces as string[]).join(" / ") : "any"} · ${author ?? ""}`,
    }),
  },
});
