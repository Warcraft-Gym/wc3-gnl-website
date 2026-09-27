import "server-only";
import { vsRaceOfSeason } from "@/lib/w3c-vs-race.mjs";
import type { Race } from "@/lib/utils";

/**
 * Read-only client for the public W3Champions API: the season split against
 * each opponent race, behind the league-vs-ladder comparison. Ladder rows and
 * MMR come from the backend sync. Games, heroes and MMR timelines stay on
 * W3Champions. Everything is cached for one day and degrades to empty
 * results when W3C is unavailable.
 */

const API = "https://website-backend.w3champions.com/api";
const REVALIDATE = 86400;

/** Record against each opponent race over the whole ladder season. */
export type VsRaceRecord = Partial<Record<Race, { wins: number; losses: number }>>;

export type W3cProfile = {
  season: number;
  battleTag: string;
  /** The whole season against each opponent race. Empty when the player has no games in it. */
  vsRace: VsRaceRecord;
  profileUrl: string;
};

/** The W3Champions profile page of a tag. */
export const w3cPlayerUrl = (battleTag: string) => `https://w3champions.com/player/${encodeURIComponent(battleTag)}`;

async function w3c<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { next: { revalidate: REVALIDATE }, headers: { accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function currentSeason(): Promise<number> {
  const seasons = await w3c<{ id: number }[]>("/ladder/seasons");
  return seasons?.length ? Math.max(...seasons.map((s) => s.id)) : 25;
}

/** The season split of one BattleTag; null when W3Champions does not answer.
 *  `season` defaults to the current W3Champions season. */
export async function getW3cProfile(battleTag: string, season?: number): Promise<W3cProfile | null> {
  const tag = encodeURIComponent(battleTag);
  season ??= await currentSeason();
  // About 49 KB: every map and every race the player picked, of which the
  // page reads one row.
  const seasonSplit = await w3c<unknown>(`/player-stats/${tag}/race-on-map-versus-race?season=${season}`);
  if (seasonSplit == null) return null;
  return { season, battleTag, vsRace: vsRaceOfSeason(seasonSplit) ?? {}, profileUrl: w3cPlayerUrl(battleTag) };
}

/** The season of a person's other tag: the whole season against each
 *  opponent race, which also gives the season record. */
export type W3cTagGames = {
  battleTag: string;
  season: number;
  /** Null when the season read fails; the page then counts no total for the tag. */
  vsRace: VsRaceRecord | null;
};

/** One W3Champions read per tag; `season` defaults to the current W3Champions season. */
export async function getW3cTagGames(battleTag: string, season?: number): Promise<W3cTagGames> {
  const tag = encodeURIComponent(battleTag);
  season ??= await currentSeason();
  const seasonSplit = await w3c<unknown>(`/player-stats/${tag}/race-on-map-versus-race?season=${season}`);
  return { battleTag, season, vsRace: vsRaceOfSeason(seasonSplit) };
}
