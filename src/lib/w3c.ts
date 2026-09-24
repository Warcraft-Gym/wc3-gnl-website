import "server-only";
import { vsRaceOfSeason } from "@/lib/w3c-vs-race.mjs";
import type { Race } from "@/lib/utils";

/**
 * Read-only client for the public W3Champions API, the same source
 * wc3.no's season view uses. Per-player ladder stats, recent matches, the
 * season split against each opponent race and one MMR timeline per ladder
 * race. Everything is cached for ten minutes and degrades to empty results
 * when W3C is unavailable.
 */

const API = "https://website-backend.w3champions.com/api";
const GATEWAY = 20; // Europe, where the GNL plays
const GAME_MODE_1V1 = 1;
const REVALIDATE = 600;

/** W3C race ids. */
const RACE_BY_ID: Record<number, Race> = { 0: "random", 1: "human", 2: "orc", 4: "nightelf", 8: "undead" };
const ID_BY_RACE: Record<Race, number> = { random: 0, human: 1, orc: 2, nightelf: 4, undead: 8 };
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

export type W3cMatch = {
  id: string;
  /** The tag of the person the game was read under. */
  battleTag: string;
  startedAt: string;
  durationSeconds: number;
  map: string;
  race: Race;
  won: boolean;
  mmrBefore: number;
  mmrGain: number;
  opponent: { name: string; battleTag: string; race: Race; mmr: number };
};

export type W3cTimelinePoint = { date: string; mmr: number };

/** The MMR run of one ladder race this season, oldest point first. */
export type W3cTimeline = { race: Race; points: W3cTimelinePoint[] };

/** Record against each opponent race over the whole ladder season. */
export type VsRaceRecord = Partial<Record<Race, { wins: number; losses: number }>>;

export type W3cHero = { id: string; games: number };

export type W3cProfile = {
  season: number;
  battleTag: string;
  ladder: W3cLadderEntry[];
  /** Last 10, newest first. */
  matches: W3cMatch[];
  /** Larger sample (up to 100 games) behind the hero figures. */
  sampleSize: number;
  /** The whole season against each opponent race. Empty when the read fails. */
  vsRace: VsRaceRecord;
  heroes: W3cHero[];
  /** One timeline per ladder race with games, in the order of `ladder`. */
  timelines: W3cTimeline[];
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
type RawMatch = {
  id: string;
  startTime: string;
  durationInSeconds: number;
  mapName: string;
  teams: {
    players: {
      battleTag: string;
      name: string;
      race: number;
      won: boolean;
      oldMmr: number;
      currentMmr: number;
      mmrGain: number;
      heroes?: { name: string; level: number }[];
    }[];
  }[];
};
type RawTimeline = { mmrRpAtDates: { mmr: number; date: string }[] };

/** Everything the profile page shows from W3Champions, for one BattleTag. */
export async function getW3cProfile(battleTag: string): Promise<W3cProfile | null> {
  const tag = encodeURIComponent(battleTag);
  const season = await currentSeason();
  const [modes, search, seasonSplit] = await Promise.all([
    w3c<RawModeStat[]>(`/players/${tag}/game-mode-stats?gateWay=${GATEWAY}&season=${season}`),
    w3c<{ matches: RawMatch[]; count: number }>(`/matches/search?playerId=${tag}&gateway=${GATEWAY}&season=${season}&pageSize=100&offset=0`),
    // About 49 KB: every map and every race the player picked, of which the
    // page reads one row. The 100-match read above cannot give a full season.
    w3c<unknown>(`/player-stats/${tag}/race-on-map-versus-race?season=${season}`),
  ]);
  if (!modes && !search) return null;
  const vsRace: VsRaceRecord = vsRaceOfSeason(seasonSplit) ?? {};

  const ladder: W3cLadderEntry[] = (modes ?? [])
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

  // One timeline per ladder race, in parallel. A race whose read fails keeps
  // its empty points and does not fail the profile.
  const timelines: W3cTimeline[] = await Promise.all(
    ladder.map(async (entry) => {
      const raw = await w3c<RawTimeline>(
        `/players/${tag}/mmr-rp-timeline?gateWay=${GATEWAY}&season=${season}&race=${ID_BY_RACE[entry.race]}&gameMode=${GAME_MODE_1V1}`,
      );
      return { race: entry.race, points: (raw?.mmrRpAtDates ?? []).map((p) => ({ date: p.date, mmr: p.mmr })) };
    }),
  );

  const isMe = (p: { battleTag: string }) => p.battleTag.toLowerCase() === battleTag.toLowerCase();
  const sample = oneVsOne(search);
  const heroCount = new Map<string, number>();
  for (const m of sample) {
    const me = m.teams.flatMap((t) => t.players).find(isMe);
    if (!me) continue;
    for (const h of me.heroes ?? []) heroCount.set(h.name, (heroCount.get(h.name) ?? 0) + 1);
  }
  const heroes = [...heroCount.entries()]
    .map(([id, games]) => ({ id, games }))
    .sort((a, b) => b.games - a.games)
    .slice(0, 6);

  const matches = toMatches(sample, battleTag).slice(0, 10);

  return {
    season,
    battleTag,
    ladder,
    matches,
    sampleSize: sample.length,
    vsRace,
    heroes,
    timelines,
    profileUrl: w3cPlayerUrl(battleTag),
  };
}

/** The 1v1 games of a match search, newest first. */
function oneVsOne(search: { matches: RawMatch[] } | null): RawMatch[] {
  return (search?.matches ?? []).filter((m) => m.teams.flatMap((t) => t.players).length === 2);
}

/** The games of a sample from the side of `battleTag`. */
function toMatches(sample: RawMatch[], battleTag: string): W3cMatch[] {
  const isMe = (p: { battleTag: string }) => p.battleTag.toLowerCase() === battleTag.toLowerCase();
  return sample
    .map((m) => {
      const all = m.teams.flatMap((t) => t.players);
      const me = all.find(isMe);
      const them = all.find((p) => !isMe(p));
      if (!me || !them) return null;
      return {
        id: m.id,
        battleTag,
        startedAt: m.startTime,
        durationSeconds: m.durationInSeconds,
        map: m.mapName,
        race: RACE_BY_ID[me.race] ?? "random",
        won: me.won,
        mmrBefore: me.oldMmr,
        mmrGain: me.mmrGain,
        opponent: { name: them.name, battleTag: them.battleTag, race: RACE_BY_ID[them.race] ?? "random", mmr: them.oldMmr },
      };
    })
    .filter((m): m is W3cMatch => m !== null);
}

/** The season games of a person's other tag: the last 10 games and the whole
 *  season against each opponent race, which also gives the season record. */
export type W3cTagGames = {
  battleTag: string;
  season: number;
  matches: W3cMatch[];
  /** Null when the season read fails; the page then counts no total for the tag. */
  vsRace: VsRaceRecord | null;
};

/** Two W3Champions reads per tag; the season list read is shared with getW3cProfile. */
export async function getW3cTagGames(battleTag: string): Promise<W3cTagGames> {
  const tag = encodeURIComponent(battleTag);
  const season = await currentSeason();
  const [search, seasonSplit] = await Promise.all([
    w3c<{ matches: RawMatch[] }>(`/matches/search?playerId=${tag}&gateway=${GATEWAY}&season=${season}&gameMode=${GAME_MODE_1V1}&pageSize=10&offset=0`),
    w3c<unknown>(`/player-stats/${tag}/race-on-map-versus-race?season=${season}`),
  ]);
  return { battleTag, season, matches: toMatches(oneVsOne(search), battleTag), vsRace: vsRaceOfSeason(seasonSplit) };
}
