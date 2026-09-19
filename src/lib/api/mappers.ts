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
  PlayerProfile,
  PlayerSeries,
  W3cRaceStat,
  Ladder,
  LadderAchievement,
  LadderPlayer,
  LadderTeam,
} from "./types";
import { slugify, raceOf, isLive, type Race } from "@/lib/utils";

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
export interface RawW3cStat {
  wc3_season: number;
  race?: string;
  mmr?: number | null;
  games?: number | null;
  wins?: number | null;
  losses?: number | null;
}
export interface RawPlayer {
  id: number;
  name: string;
  battleTag?: string;
  race?: string;
  /** Manually entered MMR; rarely filled. Prefer w3c_stats. */
  mmr?: number | null;
  country?: string;
  /** Synced from W3Champions, one row per race per ladder season. */
  w3c_stats?: RawW3cStat[];
  gnl_stats?: Array<{
    season_id?: number;
    team_id?: number;
    games?: number;
    wins?: number;
    losses?: number;
    matchup_history?: string[];
  }>;
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
  /** Race actually played in this series (W3C codes), may differ from the profile race. */
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

/** Race codes W3Champions uses in w3c_stats rows. */
const W3C_RACE: Record<string, Race> = { HU: "human", OC: "orc", OR: "orc", NE: "nightelf", UD: "undead", RnD: "random", RANDOM: "random" };

/**
 * The player's current W3Champions MMR: the newest ladder season they have
 * games in, and within it the row for their GNL race, else their most played
 * race. Falls back to the manually entered `mmr` when nothing is synced.
 */
export function currentMmr(p: RawPlayer): number | undefined {
  const rows = (p.w3c_stats ?? []).filter((r) => r.mmr != null && (r.games ?? 0) > 0);
  if (!rows.length) return p.mmr ?? undefined;
  const latest = Math.max(...rows.map((r) => r.wc3_season));
  const season = rows.filter((r) => r.wc3_season === latest);
  const race = raceOf(p.race);
  const own = season.find((r) => (r.race ? W3C_RACE[r.race] ?? raceOf(r.race) : undefined) === race);
  const pick = own ?? [...season].sort((a, b) => (b.games ?? 0) - (a.games ?? 0))[0];
  return pick?.mmr ?? undefined;
}

function mapPlayer(p: RawPlayer, teamId?: number, teamName?: string, isCaptain = false): Player {
  return {
    id: p.id,
    name: p.name,
    slug: slugify(p.name),
    battleTag: p.battleTag,
    race: raceOf(p.race),
    mmr: currentMmr(p),
    country: p.country,
    teamId,
    teamName,
    isCaptain,
  };
}

export function mapTeams(raw: RawTeam[], seasonId: number): Team[] {
  return raw.map((t) => {
    const long = t.long_name || t.name;
    const key = String(seasonId);
    const roster = t.player_by_season?.[key] ?? [];
    const captains = t.captains_by_season?.[key] ?? [];
    const captainIds = new Set(captains.map((c) => c.id));
    // Captains who also play come first, then the roster as the backend gives it.
    const players = roster
      .map((p) => mapPlayer(p, t.id, long, captainIds.has(p.id)))
      .sort((a, b) => Number(b.isCaptain) - Number(a.isCaptain));
    return {
      id: t.id,
      name: long,
      slug: slugify(long),
      tag: t.name,
      logoUrl: logoUrl(t),
      captains: captains.map((c) => ({ id: c.id, name: c.name, race: raceOf(c.race), country: c.country })),
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
      race: raceOf(s.player1_race ?? s.player1?.race),
      score: s.player1_score ?? 0,
      points: s.player1_points ?? undefined,
    },
    away: {
      playerId: s.player2?.id,
      playerName: s.player2?.name ?? "TBD",
      race: raceOf(s.player2_race ?? s.player2?.race),
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
        mmr: currentMmr(player),
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

// --- player profile ---

/** W3C rows for the newest ladder season the player has games in, best MMR first. */
export function currentW3cRows(p: RawPlayer): W3cRaceStat[] {
  const rows = (p.w3c_stats ?? []).filter((r) => r.mmr != null && (r.games ?? 0) > 0);
  if (!rows.length) return [];
  const latest = Math.max(...rows.map((r) => r.wc3_season));
  return rows
    .filter((r) => r.wc3_season === latest)
    .map((r) => ({
      season: r.wc3_season,
      race: r.race ? (W3C_RACE[r.race] ?? raceOf(r.race)) : "random",
      mmr: r.mmr ?? 0,
      games: r.games ?? 0,
      wins: r.wins ?? 0,
      losses: r.losses ?? 0,
    }))
    .sort((a, b) => b.mmr - a.mmr);
}

export function mapPlayerProfile(
  teams: RawTeam[],
  series: RawSeries[],
  career: RawCareerStat[],
  seasonId: number,
  slug: string,
): PlayerProfile | undefined {
  const key = String(seasonId);
  for (const t of teams) {
    const roster = t.player_by_season?.[key] ?? [];
    const raw = roster.find((p) => slugify(p.name) === slug);
    if (!raw) continue;
    const long = t.long_name || t.name;
    const captains = t.captains_by_season?.[key] ?? [];
    const stat = raw.gnl_stats?.find((r) => r.season_id === seasonId);
    const c = career.find((r) => r.user_id === raw.id);
    const mine = series
      .filter((s) => s.player1?.id === raw.id || s.player2?.id === raw.id)
      .map<PlayerSeries>((s) => {
        const home = s.player1?.id === raw.id;
        const me = home ? s.player1 : s.player2;
        const them = home ? s.player2 : s.player1;
        const myRace = home ? s.player1_race : s.player2_race;
        const theirRace = home ? s.player2_race : s.player1_race;
        return {
          id: s.id,
          week: s.match?.playday ?? 0,
          scheduledAt: s.date_time,
          status: playerMatchStatus(s),
          race: myRace ? (W3C_RACE[myRace] ?? raceOf(myRace)) : raceOf(me?.race),
          score: home ? s.player1_score : s.player2_score,
          opponentScore: home ? s.player2_score : s.player1_score,
          opponent: {
            id: them?.id ?? 0,
            name: them?.name ?? "TBD",
            slug: slugify(them?.name ?? ""),
            race: theirRace ? (W3C_RACE[theirRace] ?? raceOf(theirRace)) : raceOf(them?.race),
          },
          fixture: {
            homeTeam: s.match?.team1?.long_name || s.match?.team1?.name || "",
            awayTeam: s.match?.team2?.long_name || s.match?.team2?.name || "",
          },
        };
      })
      .sort((a, b) => a.week - b.week || (ms(a.scheduledAt) || 0) - (ms(b.scheduledAt) || 0));
    return {
      player: mapPlayer(raw, t.id, long, captains.some((x) => x.id === raw.id)),
      team: { id: t.id, name: long, slug: slugify(long), tag: t.name, logoUrl: logoUrl(t) },
      isCaptain: captains.some((x) => x.id === raw.id),
      season: {
        games: stat?.games ?? 0,
        wins: stat?.wins ?? 0,
        losses: stat?.losses ?? 0,
        matchupHistory: (stat?.matchup_history ?? []).map((r) => W3C_RACE[r] ?? raceOf(r)),
      },
      w3c: currentW3cRows(raw),
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
      series: mine,
    };
  }
  return undefined;
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
              slug: slugify(p.name ?? ""),
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
