import { defineArrayMember, defineField, defineType } from "sanity";
import { GAME_ICON_OPTIONS } from "../../lib/builds/icons";
import { STOP_NOTE_MAX, STOP_CONDITION_MAX } from "../../lib/creep-routes/submission.mjs";
import { PATCH_OPTIONS } from "../../lib/patches.mjs";
import { countStops } from "../../lib/creep-routes/stop-numbers.mjs";
import { CAP_OVER, MAX_IMAGE_BYTES, MAX_PATHS, MAX_ROWS, MAX_STOP_IMAGES, MAX_STOPS, rowCount } from "../../lib/creep-routes/caps.mjs";
import { apiVersion } from "../env";

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
      description: "Balance patch this was written for. Leave blank if it is not patch-specific.",
      options: { list: PATCH_OPTIONS },
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
      title: "Show first in the list",
      type: "boolean",
      group: "meta",
      initialValue: false,
      description:
        "Pins this route to the top of /learn/creep-routes when no filter or sort is applied. Only one should be on at a time.",
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
      // Two stops at least, counted with every fork way's stops: a whole-route pair is one fork.
      // The caps (12 numbered stops, 20 rows; `caps.mjs`) are warnings here: a coach may go past them.
      validation: (rule) => [
        rule.required().custom((stops) => countStops((stops ?? []) as never[]) >= 2 || "Add at least two stops"),
        rule.custom((stops) => countStops((stops ?? []) as never[]) <= MAX_STOPS || CAP_OVER.stops).warning(),
        rule.custom((stops) => rowCount((stops ?? []) as never[]) <= MAX_ROWS || CAP_OVER.rows).warning(),
        // As the submit check: an "xor" split never rejoins, so it is the last stop.
        rule.custom((stops) => {
          const list = (stops ?? []) as { _type?: string; mode?: string }[];
          return list.every((s, i) => !(s._type === "creepSplit" && s.mode === "xor") || i === list.length - 1) || "Nothing follows an either/or split";
        }),
      ],
      // `name: "stop"` keeps `_type: "stop"` on every stored stop, so existing documents stay valid.
      of: [
        defineArrayMember({ type: "creepStop", name: "stop" }),
        defineArrayMember({ type: "creepSplit" }),
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
            defineField({
              name: "display",
              type: "string",
              title: "Display size",
              description:
                "How wide to draw it. Automatic uses the image's own size, never upscaling — right for most pictures. Override when a screenshot should sit small, or an icon should be shown large.",
              options: {
                list: [
                  { title: "Automatic (the image's own size)", value: "auto" },
                  { title: "Icon — 64px", value: "icon" },
                  { title: "Small — 200px", value: "small" },
                  { title: "Medium — 420px", value: "medium" },
                  { title: "Full width of the column", value: "full" },
                ],
                layout: "dropdown",
              },
              initialValue: "auto",
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

/**
 * One stop: a camp (by id), a place (a start, mine, shop or point) or a base
 * action. A named type so a split's ways (`creepSplit`) can hold the same stops;
 * stored under the array member name "stop", as before.
 */
export const creepStop = defineType({
  name: "creepStop",
  title: "Stop",
  type: "object",
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
      description: "Base action when there's no campId, e.g. \"TP home\". On a place stop, what happens there.",
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
      description: "Conditional guidance for this stop, shown exactly as written, e.g. \"Only if both wolves are alive\".",
      validation: (rule) => rule.max(STOP_CONDITION_MAX),
    }),
    defineField({
      name: "kills",
      title: "Kill order",
      type: "array",
      description: "Creeps to kill first, in order. Row is the creep's position in the camp's list (0 is the first). Empty means the whole camp. The rest of the camp dies after these unless Skip the rest is on.",
      of: [
        defineArrayMember({
          type: "object",
          name: "kill",
          fields: [
            defineField({ name: "row", type: "number", validation: (rule) => rule.required().min(0).integer() }),
            defineField({ name: "n", title: "Count", type: "number", validation: (rule) => rule.required().min(1).integer() }),
            defineField({
              name: "set",
              title: "Set",
              type: "number",
              description: "Optional. Consecutive entries with the same number are one set, killed in any order.",
              validation: (rule) => rule.min(0).integer(),
            }),
          ],
          preview: {
            select: { row: "row", n: "n", set: "set" },
            prepare: ({ row, n, set }) => ({ title: `Row ${row} ×${n}${set === undefined ? "" : ` (set ${set})`}` }),
          },
        }),
      ],
    }),
    defineField({
      name: "leaveRest",
      title: "Skip the rest",
      type: "boolean",
      description: "On: creeps not in the kill order are skipped. Off: they die after it, in catalogue order.",
      hidden: ({ parent }) => !(parent as { kills?: unknown[] } | undefined)?.kills?.length,
    }),
    defineField({
      name: "images",
      title: "Pictures",
      type: "array",
      description: "Optional. Screenshots of the exact spot, for what the minimap cannot show. Drop images here: at most 3, each a JPEG, PNG or WebP of 5 MB or less.",
      validation: (rule) => rule.max(MAX_STOP_IMAGES).error(CAP_OVER.images),
      of: [
        defineArrayMember({
          type: "image",
          options: { hotspot: true, accept: "image/jpeg,image/png,image/webp" },
          validation: (rule) => [
            rule.assetRequired().error("Add the picture file, or remove the picture"),
            // The asset's size in bytes, read from the dataset the Studio edits.
            rule.custom(async (image, context) => {
              const ref = (image as { asset?: { _ref?: string } } | undefined)?.asset?._ref;
              if (!ref) return true;
              // A lookup that fails (Studio offline) passes: the check runs again on the next edit.
              const size = await context.getClient({ apiVersion }).fetch<number | null>("*[_id == $ref][0].size", { ref }).catch(() => null);
              return !size || size <= MAX_IMAGE_BYTES || CAP_OVER.imageBytes;
            }),
          ],
          fields: [
            defineField({ name: "alt", type: "string", description: "What the picture shows, for readers who cannot see it.", validation: (rule) => rule.required() }),
            defineField({ name: "caption", type: "string", description: "Optional. Shown under the picture when it is open." }),
          ],
        }),
      ],
    }),
    defineField({
      name: "hero",
      title: "Hero goes",
      type: "boolean",
      description: "Camp or attack stop, empty or on: the hero goes with the units in Bring; off: only the units go, the hero still gets their XP. Waypoint, empty or on: on the route, the line goes through it. Off: a pin; the line skips it.",
      hidden: ({ parent }) => {
        const p = parent as { campId?: string; place?: { kind?: string } } | undefined;
        return !p?.campId && !p?.place;
      },
    }),
    defineField({
      name: "place",
      type: "object",
      description: "Optional. An attack or a waypoint instead of a camp. Leave the camp id empty and name what happens in Action. An attack takes a stop number; build, expand, shop and scout are waypoints on the path with no number.",
      fields: [
        defineField({
          name: "kind",
          type: "string",
          options: { list: ["attack", "build", "expand", "shop", "scout"] },
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: "at",
          type: "object",
          description: "Fill exactly one: a start (player number), a gold mine (its index, 0 is the first), a shop (its id on the map), or a point (x and y).",
          validation: (rule) =>
            rule.required().custom((at) => {
              const v = (at ?? {}) as { start?: string; mine?: string; shop?: string; x?: number; y?: number };
              const spots = [v.start, v.mine, v.shop].filter(Boolean).length + (v.x !== undefined || v.y !== undefined ? 1 : 0);
              if (spots !== 1) return "Fill exactly one spot";
              if ((v.x !== undefined) !== (v.y !== undefined)) return "A point needs x and y";
              return true;
            }),
          fields: [
            defineField({ name: "start", type: "string", description: "The player number of a start." }),
            defineField({ name: "mine", type: "string", description: "The gold mine's index on the map, 0 is the first." }),
            defineField({ name: "shop", type: "string", description: "The shop's id on the map." }),
            defineField({ name: "x", type: "number", description: "A point: 0 is the left edge, 1 the right.", validation: (rule) => rule.min(0).max(1) }),
            defineField({ name: "y", type: "number", description: "A point: 0 is the top edge, 1 the bottom.", validation: (rule) => rule.min(0).max(1) }),
          ],
        }),
      ],
    }),
  ],
  preview: {
    select: { campId: "campId", action: "action", note: "note", place: "place.kind" },
    prepare: ({ campId, action, note, place }) => ({
      title: campId ? `Camp ${campId}` : place ? `${place === "attack" ? "Attack" : "Waypoint"}: ${action || place}` : action || "(stop)",
      subtitle: note,
    }),
  },
});

/**
 * A split in the route, one level deep: 2 or 3 ways of 1..n stops; a stop inside a
 * way is never a split. "and": every way at once, then the shared stops. "or": the
 * reader chooses one way by its label, then the shared stops. "xor": the reader
 * chooses one way and it never rejoins, so nothing follows the split.
 */
export const creepSplit = defineType({
  name: "creepSplit",
  title: "Split",
  type: "object",
  // As the submit check: the reader chooses an "or" / "xor" path by its label.
  validation: (rule) =>
    rule.custom((split) => {
      const v = (split ?? {}) as { mode?: string; arms?: { label?: string }[] };
      return v.mode === "and" || (v.arms ?? []).every((arm) => arm.label?.trim()) || "Say when to take this path";
    }),
  fields: [
    defineField({
      name: "mode",
      type: "string",
      options: {
        list: [
          { title: "At the same time", value: "and" },
          { title: "Choose a path, then continue", value: "or" },
          { title: "Choose a path", value: "xor" },
        ],
      },
      initialValue: "xor",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "arms",
      title: "Paths",
      type: "array",
      validation: (rule) => [rule.required().min(2), rule.max(MAX_PATHS).warning(CAP_OVER.paths)],
      of: [
        defineArrayMember({
          type: "object",
          name: "arm",
          fields: [
            defineField({
              name: "label",
              type: "string",
              description: "When to take this path, e.g. \"They are at their natural\". Required when the reader chooses a path.",
              validation: (rule) => rule.max(60),
            }),
            defineField({
              name: "stops",
              type: "array",
              validation: (rule) => rule.required().min(1),
              of: [defineArrayMember({ type: "creepStop", name: "stop" })],
            }),
          ],
          preview: {
            select: { label: "label", stops: "stops" },
            prepare: ({ label, stops }) => ({ title: label || "(path)", subtitle: `${(stops as unknown[] | undefined)?.length ?? 0} stops` }),
          },
        }),
      ],
    }),
  ],
  preview: {
    select: { mode: "mode", arms: "arms" },
    prepare: ({ mode, arms }) => ({
      title: `${mode === "and" ? "At the same time" : "Choose a path"}: ${(arms as unknown[] | undefined)?.length ?? 0} paths`,
    }),
  },
});
