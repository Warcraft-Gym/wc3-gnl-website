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
  FantasyEntry,
  FantasyPick,
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
  league_id?: number;
  name: string;
  /** Number of play rounds (weeks). The live backend sends `round_count`;
   *  `number_weeks` is kept for older payloads. */
  round_count?: number;
  number_weeks?: number;
  series_per_round?: number;
  series_per_week?: number;
  start_date?: string;
  end_date?: string;
  /** e.g. "GNL", combined with the season number for the short name. */
  league_short_name?: string;
  /** Common event phase, e.g. "signups_open" | "running" | "finished". */
  phase?: string;
}
export interface RawPlayer {
  id: number;
  name: string;
  battleTag?: string;
  race?: string;
  mmr?: number;
  country?: string;
  gnl_stats?: Array<{
    season_id?: number;
    games?: number;
    wins?: number;
    losses?: number;
  }>;
}
interface RawTeamLite {
  id: number;
  league_id?: number;
  name: string;
  long_name?: string;
  icon_url?: string;
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
export interface RawFantasyTeam {
  id: number;
  name: string;
  season_id: number;
  captain_id?: number;
  drafted_race?: string;
  player_points?: number;
  bench_points?: number;
  team_points?: number;
  race_points?: number;
  bet_points?: number;
  total_points?: number;
  captain?: RawPlayer & { country?: string };
  drafted_team?: RawTeamLite;
  drafted_players?: RawPlayer[];
}

const logoUrl = (team: RawTeamLite) =>
  team.icon_url ??
  (team.league_id
    ? `${BASE}/leagues/${team.league_id}/teams/${team.id}/image`
    : `${BASE}/teams/${team.id}/image`);
const played = (a: number, b: number) => a > 0 || b > 0;
const ms = (iso?: string) => (iso ? Date.parse(iso) : NaN);

// --- season / weeks ---
export function pickActiveSeason(raw: RawSeason[]): RawSeason {
  return [...raw].sort(
    (a, b) => (ms(b.start_date) || 0) - (ms(a.start_date) || 0) || b.id - a.id,
  )[0];
}

/** "Season 18" + league "GNL" → "GNL 18"; otherwise the season name. */
function shortSeasonName(s: RawSeason): string {
  const num = s.name.match(/\d+/)?.[0];
  return s.league_short_name && num ? `${s.league_short_name} ${num}` : s.name;
}

export function mapSeason(s: RawSeason): Season {
  const start = ms(s.start_date);
  const total = s.round_count || s.number_weeks || 1;
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
    shortName: shortSeasonName(s),
    slug: slugify(s.name),
    isActive: s.phase ? !["complete", "finished"].includes(s.phase) : true,
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
      logoUrl: logoUrl(t),
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
  return { id: t.id, name: long, slug: slugify(long), tag: t.name, logoUrl: logoUrl(t), score };
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
      team: { id: t.id, name: long, slug: slugify(long), tag: t.name, logoUrl: logoUrl(t) },
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

/** The selected event's player record, read from its team rosters. */
export function mapEventLeaderboard(
  teams: RawTeam[],
  eventId: number,
): LeaderboardRow[] {
  const seen = new Set<number>();
  const rows = teams.flatMap((team) => {
    const long = team.long_name || team.name;
    const roster = team.player_by_season?.[String(eventId)] ?? [];
    return roster.map((player) => {
      const stat = player.gnl_stats?.find((row) => row.season_id === eventId);
      const wins = stat?.wins ?? 0;
      const losses = stat?.losses ?? 0;
      const played = stat?.games ?? wins + losses;
      return {
        id: player.id,
        rank: 0,
        player: {
          id: player.id,
          name: player.name,
          slug: slugify(player.name),
          race: raceOf(player.race),
          teamName: long,
        },
        played,
        wins,
        losses,
        winrate: played ? Math.round((wins * 100) / played) : 0,
        mmr: player.mmr,
      };
    });
  }).filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });

  rows.sort(
    (a, b) =>
      b.wins - a.wins || b.winrate - a.winrate || (b.mmr ?? 0) - (a.mmr ?? 0),
  );
  rows.forEach((row, index) => (row.rank = index + 1));
  return rows;
}

// --- fantasy (managers' drafted squads for a season, ranked by total points) ---
export function mapFantasy(
  raw: RawFantasyTeam[],
  seasonId: number,
): FantasyEntry[] {
  const entries: FantasyEntry[] = raw
    .filter((t) => t.season_id === seasonId)
    .map((t) => {
      const captainId = t.captain?.id ?? t.captain_id;
      const roster: FantasyPick[] = (t.drafted_players ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        race: raceOf(p.race),
        isCaptain: p.id === captainId,
      }));
      const team = t.drafted_team;
      return {
        rank: 0,
        id: t.id,
        name: t.name,
        captain: t.captain
          ? {
              id: t.captain.id,
              name: t.captain.name,
              race: raceOf(t.captain.race),
              country: t.captain.country,
            }
          : undefined,
        draftedTeam: team
          ? {
              id: team.id,
              name: team.long_name || team.name,
              tag: team.name,
              logoUrl: logoUrl(team),
            }
          : undefined,
        draftedRace: raceOf(t.drafted_race),
        breakdown: {
          player: t.player_points ?? 0,
          bench: t.bench_points ?? 0,
          team: t.team_points ?? 0,
          race: t.race_points ?? 0,
          bet: t.bet_points ?? 0,
        },
        total: t.total_points ?? 0,
        roster,
      };
    });

  entries.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  entries.forEach((e, i) => (e.rank = i + 1));
  return entries;
}
