import { defineArrayMember, defineField, defineType } from "sanity";
import { GAME_ICON_OPTIONS } from "../../lib/builds/icons";

const RACES = [
  { title: "Human", value: "human" },
  { title: "Orc", value: "orc" },
  { title: "Night Elf", value: "nightelf" },
  { title: "Undead", value: "undead" },
];

const LEVELS = [
  { title: "Beginner", value: "beginner" },
  { title: "Standard", value: "standard" },
];

/**
 * A creep route: metadata + an ordered list of timed stops, each either a
 * camp (by id, looked up against the linked `creepMap`) or a base action
 * (`campId` empty, `action` names it — TP home, buy from shop, expand).
 * Public submissions arrive as drafts (see the "Pending review" list in the
 * Studio) and go live when an editor publishes them — same review gate as
 * `buildOrder`.
 */
export const creepRoute = defineType({
  name: "creepRoute",
  title: "Creep route",
  type: "document",
  groups: [
    { name: "meta", title: "Details", default: true },
    { name: "stops", title: "Stops" },
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
      description: "Opponent races this route is written for. Leave empty for any opponent.",
      of: [defineArrayMember({ type: "string" })],
      options: { list: RACES, layout: "grid" },
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: "level",
      type: "string",
      group: "meta",
      options: { list: LEVELS, layout: "radio", direction: "horizontal" },
      initialValue: "standard",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "map",
      title: "Map",
      type: "reference",
      to: [{ type: "creepMap" }],
      group: "meta",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "start",
      title: "Your spawn",
      type: "number",
      group: "meta",
      description: "Which spawn the route starts from; 0 unless the map has more than two.",
      validation: (rule) => rule.integer().min(0),
    }),
    defineField({
      name: "hero",
      type: "string",
      group: "meta",
      description: "Icon key for the hero this route is built around (optional).",
      options: { list: GAME_ICON_OPTIONS },
    }),
    defineField({
      name: "patch",
      type: "string",
      group: "meta",
      description: "Game patch this was written for, e.g. 2.0.3",
      validation: (rule) => rule.max(16),
    }),
    defineField({
      name: "mapVersion",
      type: "string",
      group: "meta",
      description: "The map catalogue version this route was written against, e.g. 2.0",
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
      description: "Who made the route (display name).",
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
      name: "build",
      title: "Companion build order",
      type: "reference",
      to: [{ type: "buildOrder" }],
      group: "meta",
      description: "Optional link to the build order this route pairs with.",
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
        ],
        layout: "radio",
        direction: "horizontal",
      },
      initialValue: "approved",
      description:
        "Public submissions arrive as Pending. Set to Approved once a coach has checked the route; publishing is blocked until then.",
      validation: (rule) =>
        rule.required().custom((value) =>
          value === "pending"
            ? "Still pending review. Set Review to Approved before publishing."
            : true,
        ),
    }),
    defineField({
      name: "featured",
      title: "Route of the week",
      type: "boolean",
      group: "meta",
      initialValue: false,
      description: "Shown at the top of the route list. Only one should be on at a time.",
    }),
    defineField({
      name: "publishedAt",
      type: "datetime",
      group: "meta",
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: "stops",
      type: "array",
      group: "stops",
      validation: (rule) => rule.required().min(2),
      of: [
        defineArrayMember({
          type: "object",
          name: "stop",
          fields: [
            defineField({
              name: "campId",
              title: "Camp id",
              type: "string",
              description: "The camp's id on the linked map (e.g. c01). Leave empty for a base action.",
            }),
            defineField({
              name: "time",
              type: "string",
              description: "Real game clock, mm:ss.",
              validation: (rule) =>
                rule
                  .required()
                  .regex(/^\d{1,2}:\d{2}$/, { name: "mm:ss", invert: false })
                  .warning("Use mm:ss"),
            }),
            defineField({
              name: "action",
              type: "string",
              description: "Base action when there's no campId, e.g. \"TP home\".",
              validation: (rule) => rule.max(60),
            }),
            defineField({
              name: "units",
              type: "array",
              description: "What the player brings to this stop (not the camp's contents).",
              of: [
                defineArrayMember({
                  type: "object",
                  name: "unit",
                  fields: [
                    defineField({ name: "icon", type: "string", options: { list: GAME_ICON_OPTIONS } }),
                    defineField({ name: "count", type: "number", validation: (rule) => rule.min(1).integer() }),
                  ],
                }),
              ],
            }),
            defineField({
              name: "note",
              type: "string",
              validation: (rule) => rule.max(160),
            }),
            defineField({
              name: "condition",
              type: "string",
              description: "Conditional guidance for this stop, e.g. \"only if wolves are alive\".",
              validation: (rule) => rule.max(60),
            }),
          ],
          preview: {
            select: { campId: "campId", time: "time", action: "action" },
            prepare: ({ campId, time, action }) => ({
              title: campId || action || "(stop)",
              subtitle: time,
            }),
          },
        }),
      ],
    }),

    defineField({
      name: "description",
      type: "array",
      group: "text",
      description: "The why: when to use it, deviations, what to watch for.",
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
    select: { title: "title", race: "race", vsRaces: "vsRaces", author: "author" },
    prepare: ({ title, race, vsRaces, author }) => ({
      title,
      subtitle: `${race ?? "?"} vs ${(vsRaces as string[] | undefined)?.length ? (vsRaces as string[]).join(" / ") : "any"} · ${author ?? ""}`,
    }),
  },
});
