import "server-only";
import { vsRaceOfSeason } from "@/lib/w3c-vs-race.mjs";
import type { Race } from "@/lib/utils";

/**
 * Read-only client for the public W3Champions API. Per-player ladder
 * standing and the season split against each opponent race: the two reads
 * behind the race chips and the league-vs-ladder comparison. Games, heroes
 * and MMR timelines stay on W3Champions. Everything is cached for ten
 * minutes and degrades to empty results when W3C is unavailable.
 */

const API = "https://website-backend.w3champions.com/api";
const GATEWAY = 20; // Europe, where the GNL plays
const GAME_MODE_1V1 = 1;
const REVALIDATE = 600;

/** W3C race ids. */
const RACE_BY_ID: Record<number, Race> = { 0: "random", 1: "human", 2: "orc", 4: "nightelf", 8: "undead" };
const LEAGUE_BY_ORDER = ["Grand Master", "Master", "Adept", "Diamond", "Platinum", "Gold", "Silver", "Bronze", "Grass"];

export type W3cLadderEntry = {
  race: Race;
  mmr: number;
  league: string;
  division: number;
  rank: number;
  games: number;
  wins: number;
  losses: number;
};

/** Record against each opponent race over the whole ladder season. */
export type VsRaceRecord = Partial<Record<Race, { wins: number; losses: number }>>;

export type W3cProfile = {
  season: number;
  battleTag: string;
  ladder: W3cLadderEntry[];
  /** The whole season against each opponent race. Empty when the read fails. */
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

type RawModeStat = { gameMode: number; race: number; mmr: number; leagueOrder: number; division: number; rank: number; games: number; wins: number; losses: number };

/** Everything the profile page shows from W3Champions, for one BattleTag. */
export async function getW3cProfile(battleTag: string): Promise<W3cProfile | null> {
  const tag = encodeURIComponent(battleTag);
  const season = await currentSeason();
  const [modes, seasonSplit] = await Promise.all([
    w3c<RawModeStat[]>(`/players/${tag}/game-mode-stats?gateWay=${GATEWAY}&season=${season}`),
    // About 49 KB: every map and every race the player picked, of which the
    // page reads one row.
    w3c<unknown>(`/player-stats/${tag}/race-on-map-versus-race?season=${season}`),
  ]);
  if (!modes) return null;
  const vsRace: VsRaceRecord = vsRaceOfSeason(seasonSplit) ?? {};

  const ladder: W3cLadderEntry[] = modes
    .filter((m) => m.gameMode === GAME_MODE_1V1 && m.games > 0)
    .map((m) => ({
      race: RACE_BY_ID[m.race] ?? "random",
      mmr: m.mmr,
      league: LEAGUE_BY_ORDER[m.leagueOrder] ?? "",
      division: m.division,
      rank: m.rank,
      games: m.games,
      wins: m.wins,
      losses: m.losses,
    }))
    .sort((a, b) => b.games - a.games);

  return { season, battleTag, ladder, vsRace, profileUrl: w3cPlayerUrl(battleTag) };
}

/** The season of a person's other tag: the whole season against each
 *  opponent race, which also gives the season record. */
export type W3cTagGames = {
  battleTag: string;
  season: number;
  /** Null when the season read fails; the page then counts no total for the tag. */
  vsRace: VsRaceRecord | null;
};

/** One W3Champions read per tag; the season list read is shared with getW3cProfile. */
export async function getW3cTagGames(battleTag: string): Promise<W3cTagGames> {
  const tag = encodeURIComponent(battleTag);
  const season = await currentSeason();
  const seasonSplit = await w3c<unknown>(`/player-stats/${tag}/race-on-map-versus-race?season=${season}`);
  return { battleTag, season, vsRace: vsRaceOfSeason(seasonSplit) };
}
