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
  FantasyEntry,
  FantasyPick,
  PlayerProfile,
  PlayerSeasonEntry,
  GnlRecord,
  PlayerSeries,
  W3cRaceStat,
  Ladder,
  LadderAchievement,
  LadderPlayer,
  LadderTeam,
} from "./types";
import { slugify, raceOf, isLive, type Race } from "@/lib/utils";
import { playerSlug } from "@/lib/slug.mjs";

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
  end_date?: string | null;
  /** Set when an admin closed the event. */
  closed_at?: string | null;
  /** e.g. "GNL", combined with the season number for the short name. */
  league_short_name?: string;
  /** Common event phase, e.g. "signups_open" | "running" | "finished". */
  phase?: string;
}
/** One race of the backend ladder summary. */
export interface RawRaceMmr {
  race?: string | null;
  /** The W3C season the MMR comes from. */
  wc3_season: number;
  mmr?: number | null;
  /** Summed over the window seasons; `wins` and `losses` are those of the MMR's season. */
  games?: number | null;
  wins?: number | null;
  losses?: number | null;
  /** True for a race last played before the window; profile reads only. */
  stale?: boolean;
}
export interface RawPlayer {
  id: number;
  name: string;
  battleTag?: string;
  /** A legacy field of the backend. This site does not read it. */
  race?: string;
  /** The race this player signed up with for the season of this row. */
  signup_race?: string | null;
  /** The tag of that signup; null when it names none. */
  played_as?: string | null;
  /** Every tag the person holds, the active one first; empty where the read loads none. */
  tags?: RawTag[];
  country?: string;
  /** The ladder summary, one entry per race: window races best MMR first, then stale races. */
  race_mmrs?: RawRaceMmr[];
  /** The window race with the top MMR and 10 or more games, else null. */
  main_race?: string | null;
  /** The MMR the player entered a finished event with; roster reads only. */
  mmr_entered?: number | null;
  /** The record of this player in the event of an embedded read; null when they have none. */
  record?: RawRecord | null;
  /** One entry per roster season on the single player read. */
  gnl_stats?: RawRecord[];
}
/** `games`, `wins` and `losses` count best-of-three series, not games. */
export interface RawRecord {
  season_id?: number;
  team_id?: number;
  games?: number;
  wins?: number;
  losses?: number;
  /** The opponent race of each completed series, one entry per series. */
  matchup_history?: string[];
}
export interface RawTag {
  id: number;
  tag: string;
  verified: boolean;
  active: boolean;
  source: string;
  first_seen: string;
  last_seen: string;
}
/** GET /users/{id}: the person, a seat per roster season in `gnl_stats`,
 *  and every season signup with its race and tag. */
export interface RawUser extends RawPlayer {
  signup_seasons?: Array<RawSeason & { signup_race?: string | null; played_as?: string | null }>;
}
/** The part of GET /users/{id}/history this site reads. */
export interface RawHistory {
  captain_of?: Array<{ season_id: number; team_id: number; team_name?: string | null }>;
}
export interface RawCareerStat {
  id: number;
  user_id?: number | null;
  player_name?: string | null;
  rating?: number | null;
  series_won?: number | null;
  series_lost?: number | null;
  games_won?: number | null;
  games_lost?: number | null;
  seasons_played?: number | null;
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
  captains_by_season?: Record<string, RawPlayer[]>;
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
  /** Race actually played in this series (W3C codes), may differ from the signup race. */
  player1_race?: string | null;
  player2_race?: string | null;
  player1_points?: number | null;
  player2_points?: number | null;
  casts?: Array<{ id: number; name?: string | null; channel_url?: string | null; vod_url?: string | null }>;
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

/** "Season 18" → 18; the event id when the name carries no number. */
function seasonNumber(s: RawSeason): number {
  const num = s.name.match(/\d+/)?.[0];
  return num ? Number(num) : s.id;
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
    number: seasonNumber(s),
    slug: slugify(s.name),
    isActive: s.phase ? !["complete", "finished"].includes(s.phase) : true,
    currentWeek,
    totalWeeks: total,
    startDate: s.start_date,
    endDate: s.end_date ?? undefined,
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
      // A finished season has no current week; the last one is just the last.
      isCurrent: s.isActive && i + 1 === s.currentWeek,
    };
  });
}

// --- players / teams ---

/** The backend rule for a season that is over: closed, or its end date before today (UTC); the phase decides only when both fields are absent. */
function isFinished(s: RawSeason): boolean {
  if (s.closed_at === undefined && s.end_date === undefined) return s.phase === "finished";
  return s.closed_at != null || (s.end_date != null && s.end_date.slice(0, 10) < new Date().toISOString().slice(0, 10));
}

/** Race codes W3Champions uses in ladder rows. */
const W3C_RACE: Record<string, Race> = { HU: "human", OC: "orc", OR: "orc", NE: "nightelf", UD: "undead", RnD: "random", RANDOM: "random" };

/** The race of a signup row. An empty or unknown value is no race at all. */
function signupRace(value?: string | null): Race | null {
  const race = raceOf(value);
  if (race !== "random") return race;
  return /^(rnd|random)$/i.test((value ?? "").trim()) ? race : null;
}

/** The site race of a ladder race code; no race reads as random. */
const w3cRace = (race?: string | null): Race => (race ? (W3C_RACE[race] ?? raceOf(race)) : "random");

/**
 * The player's MMR from the backend summary. On an event roster: the MMR entered
 * with on a finished event, else the live figure of the signup race. Elsewhere
 * the live figure of the main race. Undefined when there is none.
 */
export function currentMmr(p: RawPlayer, event?: "running" | "finished"): number | undefined {
  if (event === "finished") return p.mmr_entered ?? undefined;
  const race = event ? signupRace(p.signup_race) : p.main_race ? w3cRace(p.main_race) : null;
  if (!race) return undefined;
  return p.race_mmrs?.find((r) => !r.stale && r.mmr != null && w3cRace(r.race) === race)?.mmr ?? undefined;
}

function mapPlayer(
  p: RawPlayer,
  teamId?: number,
  teamName?: string,
  isCaptain = false,
  seasonId?: number,
  event?: "running" | "finished",
): Player {
  const stat = seasonId != null && p.record?.season_id === seasonId ? p.record : undefined;
  return {
    id: p.id,
    name: p.name,
    slug: playerSlug(p.id, p.name),
    battleTag: p.battleTag || undefined,
    tags: (p.tags ?? []).map((t) => t.tag),
    race: signupRace(p.signup_race),
    mmr: currentMmr(p, event),
    country: p.country,
    teamId,
    teamName,
    isCaptain,
    record: stat ? { wins: stat.wins ?? 0, losses: stat.losses ?? 0 } : undefined,
  };
}

export function mapTeams(raw: RawTeam[], season: RawSeason): Team[] {
  const seasonId = season.id;
  const event = isFinished(season) ? "finished" : "running";
  return raw.map((t) => {
    const long = t.long_name || t.name;
    const key = String(seasonId);
    const roster = t.player_by_season?.[key] ?? [];
    const captains = t.captains_by_season?.[key] ?? [];
    const captainIds = new Set(captains.map((c) => c.id));
    // Captains who also play come first, then the roster as the backend gives it.
    const players = roster
      .map((p) => mapPlayer(p, t.id, long, captainIds.has(p.id), seasonId, event))
      .sort((a, b) => Number(b.isCaptain) - Number(a.isCaptain));
    return {
      id: t.id,
      name: long,
      slug: slugify(long),
      tag: t.name,
      logoUrl: logoUrl(t),
      // A captain row carries no signup race, so a playing captain takes the one of their roster row.
      captains: captains.map((c) => ({
        id: c.id,
        name: c.name,
        slug: playerSlug(c.id, c.name),
        race: signupRace(c.signup_race ?? roster.find((p) => p.id === c.id)?.signup_race),
        country: c.country,
      })),
      players,
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
      race: raceOf(s.player1_race ?? s.player1?.signup_race),
      score: s.player1_score ?? 0,
      points: s.player1_points ?? undefined,
    },
    away: {
      playerId: s.player2?.id,
      playerName: s.player2?.name ?? "TBD",
      race: raceOf(s.player2_race ?? s.player2?.signup_race),
      score: s.player2_score ?? 0,
      points: s.player2_points ?? undefined,
    },
    hasReplays: false,
    casts: (s.casts ?? []).map((c) => ({
      id: c.id,
      name: c.name ?? "Cast",
      channelUrl: c.channel_url ?? undefined,
      vodUrl: c.vod_url ?? undefined,
    })),
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
  type Acc = { played: number; wins: number; draws: number; losses: number; mapDiff: number; results: ("W" | "D" | "L")[] };
  const stat = new Map<number, Acc>();
  const ensure = (id: number): Acc => {
    let a = stat.get(id);
    if (!a) {
      a = { played: 0, wins: 0, draws: 0, losses: 0, mapDiff: 0, results: [] };
      stat.set(id, a);
    }
    return a;
  };

  for (const f of [...fixtures].sort((x, y) => x.week - y.week)) {
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
      h.results.push("W");
      a.results.push("L");
    } else if (f.away.score > f.home.score) {
      a.wins++;
      h.losses++;
      a.results.push("W");
      h.results.push("L");
    } else {
      h.draws++;
      a.draws++;
      h.results.push("D");
      a.results.push("D");
    }
  }

  const streakOf = (results: ("W" | "D" | "L")[]): string | undefined => {
    const last = results[results.length - 1];
    if (!last || last === "D") return undefined;
    let n = 0;
    for (let i = results.length - 1; i >= 0 && results[i] === last; i--) n++;
    return `${last}${n}`;
  };

  const rows: StandingRow[] = teams.map((t) => {
    const info = t.seasons_info?.find((si) => si.season_id === seasonId);
    const s = stat.get(t.id) ?? { played: 0, wins: 0, draws: 0, losses: 0, mapDiff: 0, results: [] };
    const long = t.long_name || t.name;
    return {
      rank: 0,
      team: { id: t.id, name: long, slug: slugify(long), tag: t.name, logoUrl: logoUrl(t) },
      played: s.played,
      wins: s.wins,
      draws: s.draws,
      losses: s.losses,
      mapDiff: s.mapDiff,
      // The backend's final score is the league points total; the fallback
      // approximates it when the season info is missing.
      points: info?.final_score ?? s.wins * 3 + s.draws,
      streak: streakOf(s.results),
      form: s.results,
      captains: (t.captains_by_season?.[String(seasonId)] ?? []).map((c) => c.name),
    };
  });

  rows.sort((a, b) => b.points - a.points || b.mapDiff - a.mapDiff || b.wins - a.wins);
  rows.forEach((r, i) => (r.rank = i + 1));
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
        race: signupRace(p.signup_race),
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
              // A captain row carries no signup race, so the drafted pick holds it.
              race: signupRace(t.captain.signup_race) ?? roster.find((p) => p.id === captainId)?.race ?? null,
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

// --- player profile ---

/** The rated races of the backend summary, in its order: window races best MMR first, then stale races. */
export function currentW3cRows(p: RawPlayer): W3cRaceStat[] {
  return (p.race_mmrs ?? [])
    .filter((r) => r.mmr != null && (r.games ?? 0) > 0)
    .map((r) => ({
      season: r.wc3_season,
      race: w3cRace(r.race),
      mmr: r.mmr ?? 0,
      games: r.games ?? 0,
      wins: r.wins ?? 0,
      losses: r.losses ?? 0,
      stale: r.stale ?? false,
    }));
}

/** The reads the profile is built from, fetched by gnl.ts. */
export interface RawProfileReads {
  /** Every published, finished GNL season. */
  seasons: RawSeason[];
  user: RawUser;
  history: RawHistory;
  /** Every team of the league, for the long name and the logo. */
  leagueTeams: RawTeam[];
  /** The series of each season the player has a roster seat in, by season id. */
  series: Map<number, RawSeries[]>;
  career: RawCareerStat[];
}

/** The player's series in one season, from their side, oldest week first. */
function mapPlayerSeries(series: RawSeries[], userId: number): PlayerSeries[] {
  return series
    .filter((s) => s.player1?.id === userId || s.player2?.id === userId)
    .map<PlayerSeries>((s) => {
      const home = s.player1?.id === userId;
      const me = home ? s.player1 : s.player2;
      const them = home ? s.player2 : s.player1;
      const myRace = home ? s.player1_race : s.player2_race;
      const theirRace = home ? s.player2_race : s.player1_race;
      const c = s.casts?.find((x) => x.vod_url) ?? s.casts?.[0];
      return {
        id: s.id,
        week: s.match?.playday ?? 0,
        scheduledAt: s.date_time,
        status: playerMatchStatus(s),
        race: myRace ? (W3C_RACE[myRace] ?? raceOf(myRace)) : raceOf(me?.signup_race),
        score: home ? s.player1_score : s.player2_score,
        opponentScore: home ? s.player2_score : s.player1_score,
        opponent: {
          id: them?.id ?? 0,
          name: them?.name ?? "TBD",
          slug: playerSlug(them?.id, them?.name ?? ""),
          race: theirRace ? (W3C_RACE[theirRace] ?? raceOf(theirRace)) : raceOf(them?.signup_race),
        },
        fixture: {
          homeTeam: s.match?.team1?.long_name || s.match?.team1?.name || "",
          awayTeam: s.match?.team2?.long_name || s.match?.team2?.name || "",
        },
        cast: c
          ? { id: c.id, name: c.name ?? "Cast", channelUrl: c.channel_url ?? undefined, vodUrl: c.vod_url ?? undefined }
          : undefined,
      };
    })
    .sort((a, b) => a.week - b.week || (ms(a.scheduledAt) || 0) - (ms(b.scheduledAt) || 0));
}

/** Builds a player's profile from their roster seats (`gnl_stats`) and
 *  captain seats in the published seasons, newest first. The team and the race
 *  of the header come from the most recent of those seasons. */
export function mapPlayerProfile(reads: RawProfileReads): PlayerProfile | undefined {
  const { user, history: hist, leagueTeams, series, career } = reads;
  const teams = new Map(leagueTeams.map((t) => [t.id, t]));
  const signups = new Map((user.signup_seasons ?? []).map((s) => [s.id, s]));
  const captainOf = hist.captain_of ?? [];
  const ordered = [...reads.seasons].sort(
    (a, b) => (ms(b.start_date) || 0) - (ms(a.start_date) || 0) || b.id - a.id,
  );
  const history: PlayerSeasonEntry[] = [];
  for (const raw of ordered) {
    const stat = user.gnl_stats?.find((r) => r.season_id === raw.id && r.team_id != null);
    const seat = stat ? undefined : captainOf.find((c) => c.season_id === raw.id);
    const teamId = stat?.team_id ?? seat?.team_id;
    if (teamId == null) continue;
    const t: RawTeam = teams.get(teamId) ?? { id: teamId, name: seat?.team_name ?? "", league_id: raw.league_id };
    const long = t.long_name || t.name;
    const season = mapSeason(raw);
    const signup = signups.get(raw.id);
    history.push({
      season: { id: season.id, name: season.name, shortName: season.shortName, number: season.number },
      team: { id: t.id, name: long, slug: slugify(long), tag: t.name, logoUrl: logoUrl(t) },
      race: signupRace(signup?.signup_race),
      playedAs: signup?.played_as ?? null,
      isCaptain: captainOf.some((c) => c.season_id === raw.id && c.team_id === teamId),
      captainOnly: !stat,
      record: {
        seriesPlayed: stat?.games ?? 0,
        seriesWon: stat?.wins ?? 0,
        seriesLost: stat?.losses ?? 0,
        matchupHistory: (stat?.matchup_history ?? []).map((r) => W3C_RACE[r] ?? raceOf(r)),
      },
      series: stat ? mapPlayerSeries(series.get(raw.id) ?? [], user.id) : [],
    });
  }
  const entry = history[0];
  if (!entry) return undefined;
  const c = career.find((r) => r.user_id === user.id);
  const allTime = history.reduce<GnlRecord>(
    (acc, h) => ({
      seriesPlayed: acc.seriesPlayed + h.record.seriesPlayed,
      seriesWon: acc.seriesWon + h.record.seriesWon,
      seriesLost: acc.seriesLost + h.record.seriesLost,
      matchupHistory: [...acc.matchupHistory, ...h.record.matchupHistory],
    }),
    { seriesPlayed: 0, seriesWon: 0, seriesLost: 0, matchupHistory: [] },
  );
  // The header race is that of the latest season's signup; the MMR is that of the main race.
  const me: RawPlayer = { ...user, signup_race: signups.get(entry.season.id)?.signup_race };
  return {
    player: mapPlayer(me, entry.team.id, entry.team.name, entry.isCaptain),
    team: entry.team,
    isCaptain: entry.isCaptain,
    captainOnly: entry.captainOnly,
    latestSeason: entry.season,
    season: entry.record,
    history,
    allTime,
    w3c: currentW3cRows(me),
    mainRace: me.main_race ? w3cRace(me.main_race) : null,
    career: c
      ? {
          rating: c.rating ?? 0,
          seriesWon: c.series_won ?? 0,
          seriesLost: c.series_lost ?? 0,
          gamesWon: c.games_won ?? 0,
          gamesLost: c.games_lost ?? 0,
          seasonsPlayed: c.seasons_played ?? 0,
        }
      : undefined,
    series: entry.series,
  };
}

// --- season ladder ---
interface RawLadderAchievement {
  id: string;
  name: string;
  description: string;
  points: number;
  achieved_at?: string | null;
}
interface RawLadderPlayer {
  id: number;
  name?: string | null;
  race?: string | null;
  points: number;
  ladder_points: number;
  wins: number;
  losses: number;
  games: number;
  mmr?: { start?: number; min?: number; max?: number; current?: number } | null;
  vs_race?: Record<string, [number, number]>;
  achievements?: RawLadderAchievement[];
}
interface RawLadderTeam {
  id: number;
  name?: string | null;
  long_name?: string | null;
  points: number;
  ladder_points: number;
  games: number;
  players?: RawLadderPlayer[];
}
export interface RawLadder {
  season?: { synced_at?: string | null };
  total_games?: number;
  per_day?: { d: string; g: number }[];
  achievement_rules?: RawLadderAchievement[];
  teams?: RawLadderTeam[];
}

const toAch = (a: RawLadderAchievement): LadderAchievement => ({
  id: a.id,
  name: a.name,
  description: a.description,
  points: a.points,
  achievedAt: a.achieved_at ?? undefined,
});

export function mapLadder(raw: RawLadder, teams: RawTeam[]): Ladder {
  const logos = new Map(teams.map((t) => [t.id, logoUrl(t)]));
  return {
    totalGames: raw.total_games ?? 0,
    syncedAt: raw.season?.synced_at ?? undefined,
    perDay: (raw.per_day ?? []).map((d) => ({ date: d.d, games: d.g })),
    rules: (raw.achievement_rules ?? []).map(toAch),
    teams: (raw.teams ?? [])
      .map<LadderTeam>((t) => {
        const long = t.long_name || t.name || "";
        return {
          id: t.id,
          name: long,
          slug: slugify(long),
          tag: t.name ?? undefined,
          logoUrl: logos.get(t.id),
          points: t.points,
          ladderPoints: t.ladder_points,
          games: t.games,
          players: (t.players ?? [])
            .map<LadderPlayer>((p) => ({
              id: p.id,
              name: p.name ?? "",
              slug: playerSlug(p.id, p.name ?? ""),
              race: raceOf(p.race),
              points: p.points,
              ladderPoints: p.ladder_points,
              games: p.games,
              wins: p.wins,
              losses: p.losses,
              mmr: {
                start: p.mmr?.start ?? 0,
                min: p.mmr?.min ?? 0,
                max: p.mmr?.max ?? 0,
                current: p.mmr?.current ?? 0,
              },
              vsRace: Object.fromEntries(
                Object.entries(p.vs_race ?? {}).map(([k, [w, l]]) => [W3C_RACE[k] ?? raceOf(k), { wins: w, losses: l }]),
              ),
              achievements: (p.achievements ?? []).map(toAch),
            }))
            .sort((a, b) => b.points - a.points),
        };
      })
      .sort((a, b) => b.points - a.points),
  };
}
