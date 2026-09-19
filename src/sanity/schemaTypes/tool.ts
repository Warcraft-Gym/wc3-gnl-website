import { defineField, defineType } from "sanity";

export const TOOL_GROUPS = [
  { title: "Ladder", value: "ladder" },
  { title: "Replay parsers", value: "replays" },
  { title: "Build order overlays", value: "overlays" },
  { title: "For streamers", value: "streaming" },
  { title: "Other cool tools", value: "other" },
] as const;

/**
 * A community tool listed on /tools: a card with a preview image, a maker
 * credit and a link out. Grouped by `group`, ordered by `order` within the
 * group. Untick `live` to hide a card without deleting it.
 */
export const tool = defineType({
  name: "tool",
  title: "Tool",
  type: "document",
  fields: [
    defineField({
      name: "title",
      type: "string",
      validation: (rule) => rule.required().max(60),
    }),
    defineField({
      name: "url",
      title: "Link",
      type: "url",
      description: "Where the card sends people.",
      validation: (rule) => rule.required().uri({ scheme: ["http", "https"] }),
    }),
    defineField({
      name: "group",
      type: "string",
      options: { list: [...TOOL_GROUPS], layout: "radio" },
      initialValue: "other",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "by",
      title: "Made by",
      type: "string",
      description: "Credit shown on the card, e.g. Longjacket (dermave).",
      validation: (rule) => rule.max(60),
    }),
    defineField({
      name: "body",
      title: "Description",
      type: "text",
      rows: 3,
      description: "One or two sentences: what it does and why a player would use it.",
      validation: (rule) => rule.required().max(240),
    }),
    defineField({
      name: "image",
      title: "Preview",
      type: "image",
      description: "A screenshot of the tool, 16:9 works best.",
      options: { hotspot: true },
    }),
    defineField({
      name: "badge",
      type: "string",
      description: "Optional small tag on the title, e.g. Beta.",
      validation: (rule) => rule.max(12),
    }),
    defineField({
      name: "order",
      type: "number",
      description: "Lower numbers come first within the group.",
      initialValue: 100,
    }),
    defineField({
      name: "live",
      title: "Show on the site",
      type: "boolean",
      initialValue: true,
    }),
  ],
  orderings: [
    { title: "Group, then order", name: "groupOrder", by: [{ field: "group", direction: "asc" }, { field: "order", direction: "asc" }] },
  ],
  preview: {
    select: { title: "title", group: "group", by: "by", media: "image", live: "live" },
    prepare: ({ title, group, by, media, live }) => ({
      title: live === false ? `${title} (hidden)` : title,
      subtitle: [TOOL_GROUPS.find((g) => g.value === group)?.title, by ? `by ${by}` : null].filter(Boolean).join(" · "),
      media,
    }),
  },
});
