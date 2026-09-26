import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * The league rulebook, as editable content.
 *
 * It used to be a hardcoded array in `src/app/(site)/gnl/rules/page.tsx`,
 * which meant a rule change needed a developer and a deploy — for the one
 * page whose whole job is to be current. A single document, not a collection:
 * there is one rulebook, and `getGnlRules` reads it by the fixed id
 * `gnlRules`.
 *
 * The page keeps its built-in copy as a fallback, so an empty CMS renders the
 * rules rather than an empty page.
 */
export const gnlRules = defineType({
  name: "gnlRules",
  title: "League rules",
  type: "document",
  fields: [
    defineField({
      name: "title",
      type: "string",
      initialValue: "League rules",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "intro",
      type: "text",
      rows: 3,
      description: "One or two sentences above the rules themselves.",
    }),
    defineField({
      name: "body",
      title: "Rules",
      type: "array",
      description:
        "Headings split the rulebook into sections. A season's specifics — team count, week count, the map pool — belong here so they can be corrected without a deploy.",
      of: [
        defineArrayMember({ type: "block" }),
        defineArrayMember({
          type: "image",
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
      ],
    }),
    defineField({
      name: "updatedAt",
      title: "Rules last changed",
      type: "datetime",
      description: "Shown on the page, so a player can see how current the rules are.",
    }),
  ],
  preview: {
    select: { title: "title", updatedAt: "updatedAt" },
    prepare: ({ title, updatedAt }) => ({
      title: title ?? "League rules",
      subtitle: updatedAt ? `Updated ${new Date(updatedAt).toISOString().slice(0, 10)}` : "Never updated",
    }),
  },
});
