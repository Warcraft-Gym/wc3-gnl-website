import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * A creep map: the generated catalogue (`src/lib/creep-routes/maps/<slug>.json`,
 * see `scripts/creep-maps/build.mjs`) published to Sanity by
 * `scripts/creep-maps/publish.mjs`. Camps, starts, mines and shops are
 * machine-generated from the map file; editors may nudge a camp's `x`/`y`
 * (e.g. after eyeballing the minimap) but should otherwise leave this data
 * alone — re-publishing overwrites it from the source catalogue.
 */
export const creepMap = defineType({
  name: "creepMap",
  title: "Creep map",
  type: "document",
  groups: [
    { name: "meta", title: "Details", default: true },
    { name: "generated", title: "Generated (edit with care)" },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Name",
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
      name: "w3cMapId",
      title: "W3Champions map id",
      type: "number",
      group: "meta",
      validation: (rule) => rule.required().integer(),
    }),
    defineField({
      name: "mapVersion",
      type: "string",
      group: "meta",
      description: "Map version this catalogue was generated from, e.g. 2.0",
    }),
    defineField({
      name: "minimap",
      title: "Minimap image",
      type: "image",
      group: "meta",
      description: "The cropped minimap PNG (see docs/creep-routes.md's letterbox-crop note).",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "sourceFile",
      type: "string",
      group: "generated",
      description: "The .w3x/.w3m file the catalogue was built from.",
      readOnly: true,
    }),
    defineField({
      name: "generatedAt",
      type: "datetime",
      group: "generated",
      readOnly: true,
    }),
    defineField({
      name: "bounds",
      type: "object",
      group: "generated",
      description:
        "Playable-rect bounds (game units; terrain minus the map's unplayable border) the camp/start/mine/shop x/y are normalised against.",
      fields: [
        defineField({ name: "xMin", type: "number", validation: (rule) => rule.required() }),
        defineField({ name: "xMax", type: "number", validation: (rule) => rule.required() }),
        defineField({ name: "yMin", type: "number", validation: (rule) => rule.required() }),
        defineField({ name: "yMax", type: "number", validation: (rule) => rule.required() }),
      ],
    }),
    defineField({
      name: "image",
      type: "object",
      group: "generated",
      description: "The minimap PNG's actual pixel dimensions after the letterbox crop.",
      fields: [
        defineField({ name: "width", type: "number", validation: (rule) => rule.required().integer() }),
        defineField({ name: "height", type: "number", validation: (rule) => rule.required().integer() }),
      ],
    }),
    defineField({
      name: "camps",
      type: "array",
      group: "generated",
      description: "Creep camps. x/y may be nudged; everything else comes from the catalogue.",
      of: [
        defineArrayMember({
          type: "object",
          name: "camp",
          fields: [
            defineField({ name: "id", type: "string", validation: (rule) => rule.required() }),
            defineField({ name: "x", type: "number", validation: (rule) => rule.required().min(0).max(1) }),
            defineField({ name: "y", type: "number", validation: (rule) => rule.required().min(0).max(1) }),
            defineField({ name: "worldX", type: "number" }),
            defineField({ name: "worldY", type: "number" }),
            defineField({ name: "level", type: "number" }),
            defineField({ name: "xp", type: "number" }),
            defineField({ name: "band", type: "string" }),
            defineField({ name: "sleeps", type: "boolean" }),
            defineField({
              name: "creeps",
              type: "array",
              of: [
                defineArrayMember({
                  type: "object",
                  name: "creep",
                  fields: [
                    defineField({ name: "id", type: "string" }),
                    defineField({ name: "name", type: "string" }),
                    defineField({ name: "level", type: "number" }),
                    defineField({ name: "count", type: "number" }),
                  ],
                  preview: {
                    select: { name: "name", level: "level", count: "count" },
                    prepare: ({ name, level, count }) => ({ title: name, subtitle: `L${level} x${count}` }),
                  },
                }),
              ],
            }),
          ],
          preview: {
            select: { id: "id", level: "level", band: "band" },
            prepare: ({ id, level, band }) => ({ title: id, subtitle: `level ${level ?? "?"} · ${band ?? "?"}` }),
          },
        }),
      ],
    }),
    defineField({
      name: "starts",
      type: "array",
      group: "generated",
      of: [
        defineArrayMember({
          type: "object",
          name: "start",
          fields: [
            defineField({ name: "player", type: "number" }),
            defineField({ name: "x", type: "number" }),
            defineField({ name: "y", type: "number" }),
            defineField({ name: "worldX", type: "number" }),
            defineField({ name: "worldY", type: "number" }),
          ],
        }),
      ],
    }),
    defineField({
      name: "mines",
      type: "array",
      group: "generated",
      of: [
        defineArrayMember({
          type: "object",
          name: "mine",
          fields: [
            defineField({ name: "x", type: "number" }),
            defineField({ name: "y", type: "number" }),
            defineField({ name: "worldX", type: "number" }),
            defineField({ name: "worldY", type: "number" }),
            defineField({ name: "gold", type: "number" }),
          ],
        }),
      ],
    }),
    defineField({
      name: "shops",
      type: "array",
      group: "generated",
      of: [
        defineArrayMember({
          type: "object",
          name: "shop",
          fields: [
            defineField({ name: "id", type: "string" }),
            defineField({ name: "x", type: "number" }),
            defineField({ name: "y", type: "number" }),
          ],
        }),
      ],
    }),
  ],
  preview: {
    select: { title: "title", mapVersion: "mapVersion", camps: "camps" },
    prepare: ({ title, mapVersion, camps }) => ({
      title,
      subtitle: `v${mapVersion ?? "?"} · ${(camps as unknown[] | undefined)?.length ?? 0} camps`,
    }),
  },
});
