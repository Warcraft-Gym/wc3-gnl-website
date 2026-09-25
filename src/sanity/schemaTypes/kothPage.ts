import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * The King of the Hill page, as editable content.
 *
 * A single document read by the fixed id `kothPage`, same shape as
 * `gnlRules` — there is one KotH page, so a collection would be a list with
 * one row in it.
 *
 * The split between structured fields and free text is deliberate. The two
 * things that change every week — who currently holds each bracket, and when
 * the next one runs — are fields, so updating them is typing a name and
 * picking a date rather than editing a paragraph and hoping the formatting
 * survives. The parts that rarely change (how to join, the rules) are
 * Portable Text, because they are prose and want to stay that way.
 *
 * `nextEventAt` is one instant, not the "2 PM EST / 8 PM CET" string the old
 * WordPress page carried in two hand-maintained halves. The page renders both
 * zones from it, so they cannot drift apart or fall out of step with daylight
 * saving.
 */
export const kothPage = defineType({
  name: "kothPage",
  title: "King of the Hill",
  type: "document",
  groups: [
    { name: "thisWeek", title: "This week", default: true },
    { name: "content", title: "Standing content" },
  ],
  fields: [
    defineField({
      name: "title",
      type: "string",
      group: "content",
      initialValue: "King of the Hill",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "intro",
      type: "text",
      rows: 3,
      group: "content",
      description: "The one-paragraph explanation at the top of the page.",
    }),

    defineField({
      name: "nextEventAt",
      title: "Next event",
      type: "datetime",
      group: "thisWeek",
      description:
        "When the next KotH starts. Pick it in your own timezone; the page shows it in US Eastern and Central European time. Leave blank between seasons and the page says the next one is not scheduled rather than showing a date that has passed.",
    }),
    defineField({
      name: "streamUrl",
      title: "Stream",
      type: "url",
      group: "thisWeek",
      description: "Where it is played and watched, e.g. https://twitch.tv/Barrentv",
    }),
    defineField({
      name: "kings",
      title: "Current kings",
      type: "array",
      group: "thisWeek",
      description:
        "One row per bracket, in the order they should read. Clear them when a season ends; the page hides the section rather than showing last year's holders.",
      of: [
        defineArrayMember({
          type: "object",
          name: "king",
          fields: [
            defineField({
              name: "bracket",
              type: "string",
              description: 'The bracket, as players say it — e.g. "1600 and above".',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "player",
              type: "string",
              description: "Who holds it.",
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: { title: "player", subtitle: "bracket" },
          },
        }),
      ],
    }),

    defineField({
      name: "joining",
      title: "Who can join, and how",
      type: "array",
      group: "content",
      description: "The eligibility and sign-up explanation. MMR brackets belong here.",
      of: [defineArrayMember({ type: "block" })],
    }),
    defineField({
      name: "rules",
      title: "Rules",
      type: "array",
      group: "content",
      description: "Format, map pool, how the crown carries over. A bulleted list reads best.",
      of: [defineArrayMember({ type: "block" })],
    }),
    defineField({
      name: "updatedAt",
      title: "Page last changed",
      type: "datetime",
      group: "content",
      description: "Shown at the foot of the page, so a player can see how current it is.",
    }),
  ],
  preview: {
    select: { title: "title", nextEventAt: "nextEventAt" },
    prepare: ({ title, nextEventAt }) => ({
      title: title ?? "King of the Hill",
      subtitle: nextEventAt ? `Next: ${new Date(nextEventAt).toISOString().slice(0, 16).replace("T", " ")} UTC` : "No next event set",
    }),
  },
});
