import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * One King of the Hill event and who was crowned in each bracket.
 *
 * A document per event rather than an array on `kothPage`: a coach adds one
 * small document a week, and a 156-row array inside a singleton would be
 * miserable to edit and would grow forever.
 *
 * The back catalogue was imported from the two old WordPress pages —
 * /gyms-king-of-the-hill covers 2021-2024 and /king-of-the-hill-2 picks up
 * 2025-2026, with no overlap between them. Ten events in that history list
 * their matches but never say who was crowned; those are stored with no
 * winners rather than a guess, and the page shows them as unrecorded.
 *
 * `bracket` is free text on purpose. The brackets have been renamed several
 * times — 2021 ran "Platinum to 1700 MMR" and "Gold and below" — and forcing
 * five years of history into today's three bands would assert an equivalence
 * the source never made.
 */
export const kothResult = defineType({
  name: "kothResult",
  title: "King of the Hill result",
  type: "document",
  fields: [
    defineField({
      name: "date",
      title: "Event date",
      type: "date",
      options: { dateFormat: "YYYY-MM-DD" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "winners",
      title: "Crowned",
      type: "array",
      description: "One row per bracket. Leave empty if the winners were never recorded.",
      of: [
        defineArrayMember({
          type: "object",
          name: "crown",
          fields: [
            defineField({
              name: "bracket",
              type: "string",
              description: 'As it was called at the time — e.g. "1600+", "1450 and below".',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "player",
              type: "string",
              validation: (rule) => rule.required(),
            }),
          ],
          preview: { select: { title: "player", subtitle: "bracket" } },
        }),
      ],
    }),
    defineField({
      name: "note",
      type: "string",
      description: "Anything odd about this entry — a corrected date, a missing result.",
    }),
  ],
  orderings: [
    { name: "dateDesc", title: "Newest first", by: [{ field: "date", direction: "desc" }] },
  ],
  preview: {
    select: { date: "date", winners: "winners", note: "note" },
    prepare: ({ date, winners, note }) => {
      const list = (winners ?? []) as { player?: string; bracket?: string }[];
      return {
        title: date ?? "No date",
        subtitle: list.length
          ? list.map((w) => `${w.player} (${w.bracket})`).join(" · ")
          : note || "No winners recorded",
      };
    },
  },
});
