import "server-only";

import { apiGet, withFallback } from "./client";
import { slugify } from "@/lib/utils";
import {
  FIXTURE_SEASON,
  FIXTURE_TEAMS,
  FIXTURE_PLAYERS,
  FIXTURE_STANDINGS,
  FIXTURE_WEEKS,
  FIXTURE_FIXTURES,
  FIXTURE_FANTASY,
} from "./fixtures";
import {
  pickActiveSeason,
  mapSeason,
  deriveWeeks,
  mapTeams,
  flattenPlayers,
  mapFixtures,
  mapStandings,
  mapFantasy,
  mapPlayerProfile,
  mapLadder,
  type RawLadder,
  type RawSeason,
  type RawTeam,
  type RawPlayer,
  type RawSeries,
  type RawFantasyTeam,
  type RawCareerStat,
} from "./mappers";
import type {
  Season,
  Team,
  Player,
  StandingRow,
  Week,
  TeamFixture,
  FantasyEntry,
  PlayerProfile,
  Ladder,
} from "./types";

/**
 * Public data access for the Warcraft-Gym site.
 *
 * Each function calls the GNL FastAPI backend (via the server-only client) and
 * maps the response to the frontend domain types; on any failure, or when
 * GNL_API_BASE_URL is unset, it falls back to fixtures. See mappers.ts for the
 * backend→domain mapping.
 */

export type DataSource = "live" | "fixture";

export type TeamPageData = {
  team: Team;
  /** The season shown. */
  season: Season;
  /** Every published season the team took part in, newest first. */
  seasons: Season[];
  standing?: StandingRow;
  fixtures: TeamFixture[];
};

interface RawLeague {
  id: number;
  kind: string;
}

/**
 * The GNL event a page reads. Every league page takes an optional season
 * number (`?season=17`); without one it shows the newest finished season.
 * A running season could be shown the same way. The intended end state is a
 * landing page that switches on the season's phase (signups open, commenced,
 * complete); that logic is deferred until it is the focus.
 */
async function fetchSeasonRaw(seasonNumber?: number): Promise<RawSeason> {
  const seasons = await fetchCompletedSeasonsRaw();
  if (seasonNumber == null) return pickActiveSeason(seasons);
  const hit = seasons.find((s) => mapSeason(s).number === seasonNumber);
  // Pages resolve the season with getSeason() first and 404 on a miss, so
  // this only fires for a bad number passed straight to a loader.
  if (!hit) throw new Error(`GNL season ${seasonNumber} is not published.`);
  return hit;
}

/** Every published, finished GNL event. */
async function fetchCompletedSeasonsRaw(): Promise<RawSeason[]> {
  const leagues = await apiGet<RawLeague[]>("/leagues");
  const league = leagues.find((row) => row.kind === "gnl");
  if (!league) throw new Error("The GNL league is not configured.");
  const events = await apiGet<RawSeason[]>("/events", {
    query: { league_id: league.id, published: "true" },
  });
  const completed = events.filter((event) => event.phase === "finished");
  if (!completed.length) throw new Error("The GNL has no completed event.");
  return completed;
}

/** Every published season, newest first. Falls back to the fixture season. */
export async function getSeasons(): Promise<Season[]> {
  const { data } = await withFallback(
    async () =>
      (await fetchCompletedSeasonsRaw())
        .map(mapSeason)
        .sort((a, b) => Date.parse(b.startDate ?? "") - Date.parse(a.startDate ?? "") || b.id - a.id),
    () => [FIXTURE_SEASON],
    "getSeasons",
  );
  return data;
}

/** The season a page shows: the one asked for, else the newest. Undefined
 *  when `seasonNumber` names no published season. */
export async function getSeason(seasonNumber?: number): Promise<Season | undefined> {
  const seasons = await getSeasons();
  if (seasonNumber == null) return seasons[0];
  return seasons.find((s) => s.number === seasonNumber);
}

/** The newest season; kept for the home page and the sitemap. */
export async function getActiveSeason(): Promise<Season> {
  return (await getSeasons())[0];
}

export async function getWeeks(seasonNumber?: number): Promise<{ weeks: Week[]; source: DataSource }> {
  const { data, source } = await withFallback(
    async () => deriveWeeks(mapSeason(await fetchSeasonRaw(seasonNumber))),
    () => FIXTURE_WEEKS,
    "getWeeks",
  );
  return { weeks: data, source };
}

export async function getFixtures(seasonNumber?: number): Promise<{
  fixtures: TeamFixture[];
  source: DataSource;
}> {
  const { data, source } = await withFallback(
    async () => {
      const s = await fetchSeasonRaw(seasonNumber);
      const series = await apiGet<RawSeries[]>(`/events/${s.id}/series`);
      return mapFixtures(series);
    },
    () => FIXTURE_FIXTURES,
    "getFixtures",
  );
  return { fixtures: data, source };
}

export async function getWeekFixtures(week: number, seasonNumber?: number): Promise<{
  week: Week | undefined;
  fixtures: TeamFixture[];
  source: DataSource;
}> {
  const [{ weeks }, { fixtures, source }] = await Promise.all([
    getWeeks(seasonNumber),
    getFixtures(seasonNumber),
  ]);
  return {
    week: weeks.find((w) => w.number === week),
    fixtures: fixtures
      .filter((f) => f.week === week)
      .sort(
        (a, b) =>
          new Date(a.scheduledAt ?? 0).getTime() -
          new Date(b.scheduledAt ?? 0).getTime(),
      ),
    source,
  };
}

export async function getStandings(seasonNumber?: number): Promise<{
  rows: StandingRow[];
  source: DataSource;
}> {
  const { data, source } = await withFallback(
    async () => {
      const s = await fetchSeasonRaw(seasonNumber);
      const [teams, series] = await Promise.all([
        apiGet<RawTeam[]>(`/events/${s.id}/teams`),
        apiGet<RawSeries[]>(`/events/${s.id}/series`),
      ]);
      return mapStandings(teams, mapFixtures(series), s.id);
    },
    () => FIXTURE_STANDINGS,
    "getStandings",
  );
  return { rows: data, source };
}

export async function getTeams(seasonNumber?: number): Promise<{ teams: Team[]; source: DataSource }> {
  const { data, source } = await withFallback(
    async () => {
      const s = await fetchSeasonRaw(seasonNumber);
      const teams = await apiGet<RawTeam[]>(`/events/${s.id}/teams`);
      return mapTeams(teams, s.id);
    },
    () => FIXTURE_TEAMS,
    "getTeams",
  );
  return { teams: data, source };
}

/** A team's page for one of its seasons: the roster, standing and fixtures
 *  of that season, plus every published season the team took part in
 *  (newest first) for the switcher. Without `seasonNumber` the newest
 *  season the team played is shown. Undefined when the slug is unknown. */
export async function getTeamPage(
  slug: string,
  seasonNumber?: number,
): Promise<TeamPageData | undefined> {
  const { data } = await withFallback(
    async () => {
      const raws = await fetchCompletedSeasonsRaw();
      // One call lists every team of the league with the seasons it entered.
      const leagueTeams = await apiGet<RawTeam[]>(`/leagues/${raws[0].league_id}/teams`);
      const entered = new Set(
        leagueTeams
          .filter((t) => slugify(t.long_name || t.name) === slug)
          .flatMap((t) => (t.seasons_info ?? []).map((info) => info.season_id)),
      );
      const played = raws
        .filter((raw) => entered.has(raw.id))
        // Newest season first, by start date then number: event ids are not
        // in season order (older seasons were entered later).
        .sort(
          (a, b) =>
            (Date.parse(b.start_date ?? "") || 0) - (Date.parse(a.start_date ?? "") || 0) ||
            mapSeason(b).number - mapSeason(a).number,
        );
      if (!played.length) return null;
      const seasons = played.map(mapSeason);
      const pick = seasonNumber != null ? seasons.findIndex((s) => s.number === seasonNumber) : 0;
      if (pick < 0) return null;
      const raw = played[pick];
      const [teams, series] = await Promise.all([
        apiGet<RawTeam[]>(`/events/${raw.id}/teams`),
        apiGet<RawSeries[]>(`/events/${raw.id}/series`),
      ]);
      const fixtures = mapFixtures(series);
      const team = mapTeams(teams, raw.id).find((t) => t.slug === slug);
      if (!team) return null;
      return {
        team,
        season: seasons[pick],
        seasons,
        standing: mapStandings(teams, fixtures, raw.id).find((r) => r.team.id === team.id),
        fixtures: fixtures
          .filter((f) => f.home.id === team.id || f.away.id === team.id)
          .sort((a, b) => a.week - b.week),
      };
    },
    () => fixtureTeamPage(slug, seasonNumber),
    "getTeamPage",
  );
  return data ?? undefined;
}

/** The fixture-backed team page, for local dev without a backend. */
function fixtureTeamPage(slug: string, seasonNumber?: number): TeamPageData | null {
  const team = FIXTURE_TEAMS.find((t) => t.slug === slug);
  if (!team || (seasonNumber != null && seasonNumber !== FIXTURE_SEASON.number)) return null;
  return {
    team,
    season: FIXTURE_SEASON,
    seasons: [FIXTURE_SEASON],
    standing: FIXTURE_STANDINGS.find((r) => r.team.id === team.id),
    fixtures: FIXTURE_FIXTURES
      .filter((f) => f.home.id === team.id || f.away.id === team.id)
      .sort((a, b) => a.week - b.week),
  };
}

/** The id of the first player in one season's rosters or captains that passes `test`. */
function findPlayerId(teams: RawTeam[], seasonId: number, test: (p: RawPlayer) => boolean): number | undefined {
  const key = String(seasonId);
  return teams
    .flatMap((t) => [...(t.player_by_season?.[key] ?? []), ...(t.captains_by_season?.[key] ?? [])])
    .find(test)?.id;
}

/** A player's page: roster entry, W3C ladder rows, career stats and their
 *  record and series in every published GNL season. Undefined when the slug
 *  is unknown. */
export async function getPlayerProfile(slug: string): Promise<PlayerProfile | undefined> {
  const { data } = await withFallback(
    async () => {
      // Newest first, as mapPlayerProfile reads them: the newest season that
      // names the slug gives the player.
      const seasons = (await fetchCompletedSeasonsRaw()).sort(
        (a, b) => (Date.parse(b.start_date ?? "") || 0) - (Date.parse(a.start_date ?? "") || 0) || b.id - a.id,
      );
      const [teamsBySeason, career] = await Promise.all([
        Promise.all(seasons.map((season) => apiGet<RawTeam[]>(`/events/${season.id}/teams`))),
        apiGet<RawCareerStat[]>("/stats/career").catch(() => [] as RawCareerStat[]),
      ]);
      const userId = seasons
        .map((season, i) => findPlayerId(teamsBySeason[i], season.id, (p) => slugify(p.name) === slug))
        .find((id) => id != null);
      if (userId == null) return null;
      // Only a season whose rosters or captains hold the player needs its series.
      const bundles = await Promise.all(
        seasons.map(async (season, i) => {
          const teams = teamsBySeason[i];
          const series =
            findPlayerId(teams, season.id, (p) => p.id === userId) != null
              ? await apiGet<RawSeries[]>(`/events/${season.id}/series`)
              : [];
          return { season, teams, series };
        }),
      );
      return mapPlayerProfile(bundles, career, slug) ?? null;
    },
    () => null,
    "getPlayerProfile",
  );
  return data ?? undefined;
}

export async function getPlayers(seasonNumber?: number): Promise<{
  players: Player[];
  source: DataSource;
}> {
  const { data, source } = await withFallback(
    async () => {
      const s = await fetchSeasonRaw(seasonNumber);
      const teams = await apiGet<RawTeam[]>(`/events/${s.id}/teams`);
      return flattenPlayers(mapTeams(teams, s.id));
    },
    () => FIXTURE_PLAYERS,
    "getPlayers",
  );
  return { players: data, source };
}


export async function getFantasy(seasonNumber?: number): Promise<{
  entries: FantasyEntry[];
  source: DataSource;
}> {
  const { data, source } = await withFallback(
    async () => {
      const s = await fetchSeasonRaw(seasonNumber);
      const teams = await apiGet<RawFantasyTeam[]>(`/events/${s.id}/fantasy/teams`, {
        query: { limit: 500 },
      });
      return mapFantasy(teams, s.id);
    },
    () => FIXTURE_FANTASY,
    "getFantasy",
  );
  return { entries: data, source };
}

/** Cross-week selectors for the home page. */
export function splitFixtures(fixtures: TeamFixture[]) {
  return {
    live: fixtures.filter((f) => f.status === "live"),
    upcoming: fixtures
      .filter((f) => f.status === "scheduled")
      .sort(
        (a, b) =>
          new Date(a.scheduledAt ?? 0).getTime() -
          new Date(b.scheduledAt ?? 0).getTime(),
      ),
    results: fixtures
      .filter((f) => f.status === "completed")
      .sort(
        (a, b) =>
          new Date(b.scheduledAt ?? 0).getTime() -
          new Date(a.scheduledAt ?? 0).getTime(),
      ),
  };
}

/** The season ladder challenge: points, games and achievements per team and
 *  player, from W3Champions games played during the season. */
export async function getLadder(seasonNumber?: number): Promise<{ ladder: Ladder | null; source: DataSource }> {
  const { data, source } = await withFallback(
    async () => {
      const s = await fetchSeasonRaw(seasonNumber);
      const [ladder, teams] = await Promise.all([
        apiGet<RawLadder>(`/events/${s.id}/ladder`, { revalidate: 900 }),
        apiGet<RawTeam[]>(`/events/${s.id}/teams`),
      ]);
      return mapLadder(ladder, teams);
    },
    () => null,
    "getLadder",
  );
  return { ladder: data, source };
}
