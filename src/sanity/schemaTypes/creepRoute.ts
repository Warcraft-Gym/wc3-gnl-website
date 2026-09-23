import { defineArrayMember, defineField, defineType } from "sanity";
import { GAME_ICON_OPTIONS } from "../../lib/builds/icons";
import { STOP_NOTE_MAX, STOP_CONDITION_MAX } from "../../lib/creep-routes/submission.mjs";

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
 * A creep route: metadata + an ordered list of stops (no time dimension —
 * a route is the camps in the order you clear them, nothing more), each
 * either a camp (by id, looked up against the linked `creepMap`) or a base
 * action (`campId` empty, `action` names it — TP home, buy from shop,
 * expand). Public submissions arrive as drafts (see the "Pending review"
 * list in the Studio) and go live when an editor publishes them — same
 * review gate as `buildOrder`.
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
      description:
        "Camp ids below (c01, c09, …) aren't shown on a map here — to see where a camp actually is, open /learn/creep-routes/submit?map=<slug> on the site (swap <slug> for this map's slug).",
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
      name: "videoUrl",
      title: "Video",
      type: "url",
      group: "meta",
      description:
        "A YouTube or Vimeo link showing the route being played. Embedded above the notes. " +
        "Distinct from Source link, which credits where the route came from and stays a link.",
    }),
    defineField({
      name: "supersedes",
      title: "Replaces",
      type: "reference",
      to: [{ type: "creepRoute" }],
      group: "meta",
      description:
        "The route this one replaces. Set automatically when an author resubmits an updated version, and shown on the " +
        "older route so readers are sent to the current one. Approving the replacement is the moment to set the older " +
        "route's Review to Archived.",
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
        "Public submissions arrive as Pending. Set to Approved once a coach has checked the route; publishing is blocked " +
        "until then. Archived hides it from the site without deleting it — use that to retract a route, or when a newer " +
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
      // `FieldGroupDefinition` has no `description` of its own (Sanity
      // 6.10) — this is the group's one real field, so its description
      // reads as the group's note in practice. A reviewing coach sees only
      // a bare camp id ("c09") per stop below; there is no map preview in
      // the Studio to cross-reference it against (F010, gaps.md #2 — a
      // real map preview inside the Studio stays backlog).
      description:
        "A reviewing coach can't see camp ids on a map here. To check what a camp id actually is, open /learn/creep-routes/submit?map=<slug> on the site (swap <slug> for this route's map).",
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
              // `text`, not `string`: notes are prose and reviewers need a
              // textarea, same as the public editor gives authors.
              type: "text",
              rows: 3,
              description: "What to do at this camp and why.",
              validation: (rule) => rule.max(STOP_NOTE_MAX),
            }),
            defineField({
              name: "condition",
              type: "string",
              description: "Conditional guidance for this stop, e.g. \"only if wolves are alive\".",
              validation: (rule) => rule.max(STOP_CONDITION_MAX),
            }),
          ],
          preview: {
            select: { campId: "campId", action: "action", note: "note" },
            prepare: ({ campId, action, note }) => ({
              title: campId ? `Camp ${campId}` : action || "(stop)",
              subtitle: note,
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
