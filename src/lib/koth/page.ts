import "server-only";
import { isSanityConfigured, sanityClient } from "@/lib/content/sanity";

/**
 * The King of the Hill page.
 *
 * One document at the fixed id `kothPage`, same pattern as the league
 * rulebook. Unlike the rulebook this one has no full fallback: the standing
 * copy below (what KotH is, who can join, the rules) is carried over from the
 * old WordPress page and renders on an empty CMS, but the **current kings and
 * the next date are never faked**. Those are the two things a reader actually
 * comes for, and a wrong answer there is worse than no answer — so when the
 * CMS has not set them, the page says so.
 *
 * That is not hypothetical. The old page advertised "Next King of the Hill:
 * January 3, 2025" and three kings who had long since been dethroned; its own
 * results section, further down the same page, contradicted the kings block.
 * Structured fields and an honest empty state are the fix.
 */

export type KothKing = { _key?: string; bracket: string; player: string };

export type KothPage = {
  title?: string;
  intro?: string;
  nextEventAt?: string;
  streamUrl?: string;
  kings?: KothKing[];
  joining?: unknown[];
  rules?: unknown[];
  updatedAt?: string;
};

/** The standing copy from the old page, used when the CMS has none. Prose
 *  only — deliberately no kings and no date. */
export const FALLBACK = {
  title: "King of the Hill",
  intro:
    "King of the Hill is a casual weekly competition hosted by WC3 Gym. Players play best-of-one matches where the winner stays on and is crowned King. Anyone can step up and challenge the current king to take the throne.",
  streamUrl: "https://twitch.tv/Barrentv",
  joining: [
    "Anyone can join so long as you are below 1750 MMR — the line is wiggly, and players over 1750 can play if their opponent does not mind.",
    "There are three brackets: 1600 to 1750, 1450 to 1600, and 1450 and below.",
    "To join, show up at or after the start time on the stream and tell the streamer you want to take part. It runs for a few hours and you can jump in at the start, the end, or the middle.",
  ],
  rules: [
    "Best of one. The challenger picks the map.",
    "The winner stays on.",
    "The map pool is the W3Champions solo pool.",
    "If the previous winner is there at the start, they play first to defend the title. If not, two players are drawn at random for the crown.",
    "Games are played on FLO, on whichever server gives the fairest ping between the two players.",
  ],
} as const;

const PROJECTION = `{
  title,
  intro,
  nextEventAt,
  streamUrl,
  "kings": coalesce(kings[]{ _key, bracket, player }, []),
  joining,
  rules,
  updatedAt
}`;

export async function getKothPage(): Promise<KothPage | null> {
  if (!isSanityConfigured()) return null;
  const client = sanityClient();
  if (!client) return null;
  try {
    return await client.fetch<KothPage | null>(
      `*[_id == "kothPage"][0]${PROJECTION}`,
      {},
      { next: { revalidate: 300 } },
    );
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[koth] page fetch failed, using the built-in copy -", String(err));
    }
    return null;
  }
}
