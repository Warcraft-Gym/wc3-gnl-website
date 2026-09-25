import "server-only";
import { isSanityConfigured, sanityClient } from "@/lib/content/sanity";

/**
 * The league rulebook.
 *
 * One document, read by its fixed id — there is only ever one rulebook, so a
 * collection would be a list with a single row in it.
 *
 * Falls back to `FALLBACK_RULES` when the CMS has nothing, which keeps the
 * page useful on a fresh dataset and on a preview deployment with no Sanity
 * credentials. The two shapes differ (Portable Text vs plain sections), so
 * the page checks which one it got.
 */

export type GnlRules = {
  title: string;
  intro?: string;
  body?: unknown[];
  updatedAt?: string;
};

/** The rules as they were hardcoded into the page, kept as the fallback so an
 *  empty CMS still renders a rulebook rather than an empty page. Merged with
 *  the specifics the old WordPress page carried — team count, the length of
 *  the round robin, the sitting rule — which the hardcoded version had lost. */
export const FALLBACK_RULES: { title: string; points: string[] }[] = [
  {
    title: "Season format",
    points: [
      "Six teams, drafted at the start of each season from the signed-up player pool.",
      "Five weeks of round robin: every team plays every other team once.",
      "Each week you are matched with someone of equal skill from the opposing team, 1v1, best of three — one game a week.",
      "Teams sit several players each week so the matches are as even as possible. Captains try not to sit anyone two weeks running.",
      "Scoring: 4 points for a 2–0, 3 for a 2–1, and 1 for a 1–2 loss. The table is ordered by points, then map differential.",
    ],
  },
  {
    title: "Scheduling",
    points: [
      "Players set their availability and agree a time through the dashboard.",
      "Unscheduled games default to the standard Gym Newbie League slot for that week.",
      "Both players confirm the result; admins only step in for disputes.",
    ],
  },
  {
    title: "Playoffs",
    points: [
      "The top teams from the regular season go through to the playoff bracket.",
      "Playoff series are best of three, same map pool as the regular season.",
    ],
  },
];

const PROJECTION = `{ title, intro, body, updatedAt }`;

export async function getGnlRules(): Promise<GnlRules | null> {
  if (!isSanityConfigured()) return null;
  const client = sanityClient();
  if (!client) return null;
  try {
    const doc = await client.fetch<GnlRules | null>(
      `*[_id == "gnlRules"][0]${PROJECTION}`,
      {},
      { next: { revalidate: 300 } },
    );
    // An empty body is the same as no document: render the fallback rather
    // than a heading with nothing under it.
    return doc?.body?.length ? doc : null;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[gnl] rules fetch failed, using the built-in copy -", String(err));
    }
    return null;
  }
}
