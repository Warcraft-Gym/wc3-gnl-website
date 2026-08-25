import "server-only";
import type {
  Season,
  Week,
  Team,
  Player,
  TeamFixture,
  FixtureTeam,
  PlayerMatch,
  MatchStatus,
  StandingRow,
  LeaderboardRow,
} from "./types";
import { slugify, raceOf, isLive } from "@/lib/utils";

/**
 * Maps the GNL FastAPI backend responses to the frontend domain types.
 * Backend shape: a `match` (team1 vs team2, `playday` = week, aggregate scores)
 * contains many `series` (player1 vs player2). That's TeamFixture → PlayerMatch.
 */

const BASE = process.env.GNL_API_BASE_URL?.replace(/\/$/, "") ?? "";
const DAY = 86_400_000;

// --- raw backend shapes (only the fields we consume) ---
export interface RawSeason {
  id: number;
  name: string;
  number_weeks: number;
  series_per_week?: number;
  start_date?: string;
  end_date?: string;
}
export interface RawPlayer {
  id: number;
  name: string;
  battleTag?: string;
  race?: string;
  mmr?: number;
  country?: string;
}
interface RawTeamLite {
  id: number;
  name: string;
  long_name?: string;
}
interface RawSeasonInfo {
  season_id: number;
  final_score?: number;
  points_available?: number;
  points_against?: number;
}
export interface RawTeam extends RawTeamLite {
  player_by_season?: Record<string, RawPlayer[]>;
  seasons_info?: RawSeasonInfo[];
}
interface RawMatch {
  id: number;
  season_id: number;
  playday: number;
  team1: RawTeamLite;
  team2: RawTeamLite;
  team1_score: number;
  team2_score: number;
}
export interface RawSeries {
  id: number;
  date_time?: string;
  player1_score: number;
  player2_score: number;
  player1: RawPlayer;
  player2: RawPlayer;
  match: RawMatch;
}

const logoUrl = (teamId: number) => `${BASE}/teams/${teamId}/image`;
const played = (a: number, b: number) => a > 0 || b > 0;
const ms = (iso?: string) => (iso ? Date.parse(iso) : NaN);

// --- season / weeks ---
export function pickActiveSeason(raw: RawSeason[]): RawSeason {
  return [...raw].sort(
    (a, b) => (ms(b.start_date) || b.id) - (ms(a.start_date) || a.id),
  )[0];
}

export function mapSeason(s: RawSeason): Season {
  const start = ms(s.start_date);
  const total = s.number_weeks || 1;
  let currentWeek = total;
  if (!Number.isNaN(start)) {
    currentWeek = Math.min(
      Math.max(Math.floor((Date.now() - start) / (7 * DAY)) + 1, 1),
      total,
    );
  }
  return {
    id: s.id,
    name: s.name,
    shortName: s.name,
    slug: slugify(s.name),
    isActive: true,
    currentWeek,
    totalWeeks: total,
    startDate: s.start_date,
    endDate: s.end_date,
  };
}

export function deriveWeeks(s: Season): Week[] {
  const start = s.startDate ? Date.parse(s.startDate) : Date.now();
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const dayFmt = new Intl.DateTimeFormat("en-US", { day: "numeric" });
  return Array.from({ length: s.totalWeeks }, (_, i) => {
    const wkStart = start + i * 7 * DAY;
    return {
      number: i + 1,
      label: `${fmt.format(new Date(wkStart))} – ${dayFmt.format(new Date(wkStart + 6 * DAY))}`,
      startDate: new Date(wkStart).toISOString(),
      endDate: new Date(wkStart + 6 * DAY).toISOString(),
      isCurrent: i + 1 === s.currentWeek,
    };
  });
}

// --- players / teams ---
function mapPlayer(p: RawPlayer, teamId?: number, teamName?: string): Player {
  return {
    id: p.id,
    name: p.name,
    slug: slugify(p.name),
    battleTag: p.battleTag,
    race: raceOf(p.race),
    mmr: p.mmr,
    country: p.country,
    teamId,
    teamName,
  };
}

export function mapTeams(raw: RawTeam[], seasonId: number): Team[] {
  return raw.map((t) => {
    const long = t.long_name || t.name;
    const roster = t.player_by_season?.[String(seasonId)] ?? [];
    return {
      id: t.id,
      name: long,
      slug: slugify(long),
      tag: t.name,
      logoUrl: logoUrl(t.id),
      captainId: roster[0]?.id,
      players: roster.map((p) => mapPlayer(p, t.id, long)),
    };
  });
}

export function flattenPlayers(teams: Team[]): Player[] {
  return teams.flatMap((t) => t.players);
}

// --- fixtures (group series by match) ---
function fixtureTeam(t: RawTeamLite, score: number): FixtureTeam {
  const long = t.long_name || t.name;
  return { id: t.id, name: long, slug: slugify(long), tag: t.name, logoUrl: logoUrl(t.id), score };
}

function playerMatchStatus(s: RawSeries): MatchStatus {
  if (isLive(s.date_time)) return "live";
  if (played(s.player1_score, s.player2_score)) return "completed";
  const t = ms(s.date_time);
  return !Number.isNaN(t) && t > Date.now() ? "scheduled" : "completed";
}

function toPlayerMatch(s: RawSeries): PlayerMatch {
  return {
    id: s.id,
    scheduledAt: s.date_time,
    status: playerMatchStatus(s),
    home: {
      playerId: s.player1?.id,
      playerName: s.player1?.name ?? "TBD",
      race: raceOf(s.player1?.race),
      score: s.player1_score ?? 0,
    },
    away: {
      playerId: s.player2?.id,
      playerName: s.player2?.name ?? "TBD",
      race: raceOf(s.player2?.race),
      score: s.player2_score ?? 0,
    },
    hasReplays: false,
  };
}

export function mapFixtures(raw: RawSeries[]): TeamFixture[] {
  const byMatch = new Map<number, RawSeries[]>();
  for (const s of raw) {
    if (!s.match) continue;
    const arr = byMatch.get(s.match.id) ?? [];
    arr.push(s);
    byMatch.set(s.match.id, arr);
  }

  const fixtures: TeamFixture[] = [];
  for (const list of byMatch.values()) {
    const m = list[0].match;
    const matches = list
      .map(toPlayerMatch)
      .sort((a, b) => (ms(a.scheduledAt) || 0) - (ms(b.scheduledAt) || 0));
    const scheduledAt = matches.find((x) => x.scheduledAt)?.scheduledAt;
    const hasScore =
      played(m.team1_score, m.team2_score) ||
      matches.some((x) => x.status === "completed");
    const date = ms(scheduledAt);

    let status: MatchStatus;
    if (matches.some((x) => x.status === "live")) status = "live";
    else if (hasScore) status = "completed";
    else if (!Number.isNaN(date) && date > Date.now()) status = "scheduled";
    else status = "completed";

    fixtures.push({
      id: m.id,
      week: m.playday,
      seasonId: m.season_id,
      status,
      scheduledAt,
      home: fixtureTeam(m.team1, m.team1_score),
      away: fixtureTeam(m.team2, m.team2_score),
      matches,
    });
  }

  return fixtures.sort(
    (a, b) => a.week - b.week || (ms(a.scheduledAt) || 0) - (ms(b.scheduledAt) || 0),
  );
}

// --- standings (team points from seasons_info, W/L/diff from fixtures) ---
export function mapStandings(
  teams: RawTeam[],
  fixtures: TeamFixture[],
  seasonId: number,
): StandingRow[] {
  type Acc = { played: number; wins: number; losses: number; mapDiff: number };
  const stat = new Map<number, Acc>();
  const ensure = (id: number): Acc => {
    let a = stat.get(id);
    if (!a) {
      a = { played: 0, wins: 0, losses: 0, mapDiff: 0 };
      stat.set(id, a);
    }
    return a;
  };

  for (const f of fixtures) {
    if (f.status !== "completed") continue;
    const h = ensure(f.home.id);
    const a = ensure(f.away.id);
    h.played++;
    a.played++;
    h.mapDiff += f.home.score - f.away.score;
    a.mapDiff += f.away.score - f.home.score;
    if (f.home.score > f.away.score) {
      h.wins++;
      a.losses++;
    } else if (f.away.score > f.home.score) {
      a.wins++;
      h.losses++;
    }
  }

  const rows: StandingRow[] = teams.map((t) => {
    const info = t.seasons_info?.find((si) => si.season_id === seasonId);
    const s = stat.get(t.id) ?? { played: 0, wins: 0, losses: 0, mapDiff: 0 };
    const long = t.long_name || t.name;
    return {
      rank: 0,
      team: { id: t.id, name: long, slug: slugify(long), tag: t.name, logoUrl: logoUrl(t.id) },
      played: s.played,
      wins: s.wins,
      losses: s.losses,
      mapDiff: s.mapDiff,
      points: info?.final_score ?? s.wins * 3,
    };
  });

  rows.sort((a, b) => b.points - a.points || b.mapDiff - a.mapDiff || b.wins - a.wins);
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

// --- leaderboard (derived from series results) ---
export function mapLeaderboard(raw: RawSeries[]): LeaderboardRow[] {
  type Acc = { player: RawPlayer; wins: number; losses: number };
  const agg = new Map<number, Acc>();
  const ensure = (p: RawPlayer): Acc => {
    let a = agg.get(p.id);
    if (!a) {
      a = { player: p, wins: 0, losses: 0 };
      agg.set(p.id, a);
    }
    return a;
  };

  for (const s of raw) {
    if (!played(s.player1_score, s.player2_score)) continue;
    const a = ensure(s.player1);
    const b = ensure(s.player2);
    if (s.player1_score > s.player2_score) {
      a.wins++;
      b.losses++;
    } else if (s.player2_score > s.player1_score) {
      b.wins++;
      a.losses++;
    }
  }

  const rows: LeaderboardRow[] = [...agg.values()].map((x) => {
    const p = x.wins + x.losses;
    return {
      rank: 0,
      player: {
        id: x.player.id,
        name: x.player.name,
        slug: slugify(x.player.name),
        race: raceOf(x.player.race),
        teamName: undefined,
      },
      played: p,
      wins: x.wins,
      losses: x.losses,
      winrate: p ? Math.round((x.wins / p) * 100) : 0,
      mmr: x.player.mmr,
    };
  });

  rows.sort(
    (a, b) => b.wins - a.wins || b.winrate - a.winrate || (b.mmr ?? 0) - (a.mmr ?? 0),
  );
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}
