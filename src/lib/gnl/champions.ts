import "server-only";
import { getPosts } from "@/lib/content";
import { getSeasons, getStandings, type DataSource } from "@/lib/api/gnl";
import type { Season, StandingRow } from "@/lib/api/types";
import { indexRecaps } from "./recap-match.mjs";

/**
 * Who won each GNL season.
 *
 * There is no "champion" field anywhere: the winner is the team at the top of
 * that season's table. That is not an assumption — for all nine seasons the
 * API carries (10 to 18) the table leader is exactly the team the site's own
 * announcement post names, so the regular-season table decides it.
 *
 * A season with no standings is skipped rather than shown with an empty
 * trophy: better to be silent about a season than to invent a winner for it.
 */

/** Gold, silver, bronze — the three the podium art is drawn for. */
export const PODIUM_PLACES = [
  { rank: 1, label: "Champion", art: "/graphics/gnl-1st-gold.png" },
  { rank: 2, label: "Runner-up", art: "/graphics/gnl-2nd-silver.png" },
  { rank: 3, label: "Third", art: "/graphics/gnl-3rd-bronze.png" },
] as const;

export type SeasonPodium = {
  season: Season;
  /** Ranks 1 to 3 in order. Shorter if the season had fewer teams — a
   *  five-team season still has a podium, a two-team one does not have a
   *  third place, and inventing one would be worse than leaving it out. */
  podium: StandingRow[];
  /** The champion, for the many places that only want the winner. */
  champion: StandingRow;
  /** The post announcing the winner, when there is one. */
  recap?: { title: string; slug: string };
};

export async function getChampions(): Promise<{ champions: SeasonPodium[]; source: DataSource }> {
  const seasons = await getSeasons();

  // One standings call per season, in parallel — nine cached fetches, not a
  // waterfall. A season whose call fails is dropped by the filter below.
  const settled = await Promise.all(
    seasons.map(async (season) => {
      try {
        const { rows, source } = await getStandings(season.number);
        const podium = PODIUM_PLACES.map((p) => rows.find((r) => r.rank === p.rank)).filter(
          (r): r is StandingRow => Boolean(r),
        );
        // No rank 1 means no result worth showing, whatever else came back.
        return podium[0]?.rank === 1 ? { season, podium, source } : null;
      } catch {
        return null;
      }
    }),
  );

  const found = settled.filter((x): x is NonNullable<typeof x> => x !== null);

  // If any season fell back to fixtures the page should say so, so the worst
  // source wins rather than the first.
  const source: DataSource = found.some((f) => f.source !== "live") ? (found[0]?.source ?? "live") : "live";

  const { posts } = await getPosts();
  const recaps = indexRecaps(posts) as Record<number, { title: string; slug: string }>;

  const champions = found
    .map(({ season, podium }) => ({ season, podium, champion: podium[0], recap: recaps[season.number] }))
    .sort((a, b) => b.season.number - a.season.number);

  return { champions, source };
}
