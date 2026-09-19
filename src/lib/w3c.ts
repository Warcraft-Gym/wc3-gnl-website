import "server-only";
import type { Race } from "@/lib/utils";

/**
 * Read-only client for the public W3Champions API, the same source
 * wc3.no's season view uses. Per-player ladder stats, recent matches and
 * the MMR timeline for the current ladder season. Everything is cached
 * for ten minutes and degrades to empty results when W3C is unavailable.
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

export type W3cMatch = {
  id: string;
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

/** Record against each opponent race this ladder season. */
export type VsRaceRecord = Partial<Record<Race, { wins: number; losses: number }>>;

export type W3cHero = { id: string; games: number };

export type W3cProfile = {
  season: number;
  battleTag: string;
  ladder: W3cLadderEntry[];
  /** Last 10, newest first. */
  matches: W3cMatch[];
  /** Larger sample (up to 100 games) behind the vs-race and hero figures. */
  sampleSize: number;
  vsRace: VsRaceRecord;
  heroes: W3cHero[];
  timeline: W3cTimelinePoint[];
  profileUrl: string;
};

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
  const [modes, search] = await Promise.all([
    w3c<RawModeStat[]>(`/players/${tag}/game-mode-stats?gateWay=${GATEWAY}&season=${season}`),
    w3c<{ matches: RawMatch[]; count: number }>(`/matches/search?playerId=${tag}&gateway=${GATEWAY}&season=${season}&pageSize=100&offset=0`),
  ]);
  if (!modes && !search) return null;

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

  const main = ladder[0];
  const timelineRaw = main
    ? await w3c<RawTimeline>(
        `/players/${tag}/mmr-rp-timeline?gateWay=${GATEWAY}&season=${season}&race=${Object.entries(RACE_BY_ID).find(([, r]) => r === main.race)?.[0] ?? 0}&gameMode=${GAME_MODE_1V1}`,
      )
    : null;

  const isMe = (p: { battleTag: string }) => p.battleTag.toLowerCase() === battleTag.toLowerCase();
  const sample = (search?.matches ?? []).filter((m) => m.teams.flatMap((t) => t.players).length === 2);
  const vsRace: VsRaceRecord = {};
  const heroCount = new Map<string, number>();
  for (const m of sample) {
    const all = m.teams.flatMap((t) => t.players);
    const me = all.find(isMe);
    const them = all.find((p) => !isMe(p));
    if (!me || !them) continue;
    const r = RACE_BY_ID[them.race] ?? "random";
    const rec = (vsRace[r] ??= { wins: 0, losses: 0 });
    if (me.won) rec.wins++;
    else rec.losses++;
    for (const h of me.heroes ?? []) heroCount.set(h.name, (heroCount.get(h.name) ?? 0) + 1);
  }
  const heroes = [...heroCount.entries()]
    .map(([id, games]) => ({ id, games }))
    .sort((a, b) => b.games - a.games)
    .slice(0, 6);

  const matches: W3cMatch[] = sample
    .slice(0, 10)
    .map((m) => {
      const all = m.teams.flatMap((t) => t.players);
      const me = all.find(isMe);
      const them = all.find((p) => !isMe(p));
      if (!me || !them) return null;
      return {
        id: m.id,
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

  return {
    season,
    battleTag,
    ladder,
    matches,
    sampleSize: sample.length,
    vsRace,
    heroes,
    timeline: (timelineRaw?.mmrRpAtDates ?? []).map((p) => ({ date: p.date, mmr: p.mmr })),
    profileUrl: `https://w3champions.com/player/${tag}`,
  };
}
