import "server-only";

import { ApiError, apiGet, apiGetAll, withFallback } from "./client";
import { slugify } from "@/lib/utils";
import { slugMatch } from "@/lib/tags.mjs";
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
  matchesToFixtures,
  mapStandings,
  mapFantasy,
  mapPlayerProfile,
  mapLadder,
  type RawLadder,
  type RawSeason,
  type RawTeam,
  type RawSeries,
  type RawMatch,
  type RawFantasyTeam,
  type RawCareerStat,
  type RawUserSeason,
  type RawUserSeries,
  type RawUser,
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
  // The backend edge caches both reads an hour, so a shorter timer only rewrites the cache
  const leagues = await apiGet<RawLeague[]>("/leagues", { revalidate: 3600 });
  const league = leagues.find((row) => row.kind === "gnl");
  if (!league) throw new Error("The GNL league is not configured.");
  const events = await apiGet<RawSeason[]>("/events", {
    revalidate: 3600,
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
      const series = await apiGetAll<RawSeries>(`/events/${s.id}/series`);
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
      const [teams, matches] = await Promise.all([
        apiGet<RawTeam[]>(`/events/${s.id}/teams`),
        apiGet<RawMatch[]>(`/events/${s.id}/matches`),
      ]);
      return mapStandings(teams, matchesToFixtures(matches), s.id);
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
      return mapTeams(teams, s);
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
      const [teams, matches] = await Promise.all([
        apiGet<RawTeam[]>(`/events/${raw.id}/teams`),
        apiGet<RawMatch[]>(`/events/${raw.id}/matches`),
      ]);
      const team = mapTeams(teams, raw).find((t) => t.slug === slug);
      if (!team) return null;
      const teamSeries = await apiGetAll<RawSeries>(`/events/${raw.id}/series`, {
        query: { team_id: team.id },
      });
      return {
        team,
        season: seasons[pick],
        seasons,
        standing: mapStandings(teams, matchesToFixtures(matches), raw.id).find((r) => r.team.id === team.id),
        fixtures: mapFixtures(teamSeries)
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

/** Every completed season, newest first, with its teams' rosters and captains. */
// ponytail: one teams read per season, for old name links only; the backend has no name or tag-name search of past rosters.
async function fetchSeasonRosters(): Promise<{ season: RawSeason; teams: RawTeam[] }[]> {
  const seasons = (await fetchCompletedSeasonsRaw()).sort(
    (a, b) => (Date.parse(b.start_date ?? "") || 0) - (Date.parse(a.start_date ?? "") || 0) || b.id - a.id,
  );
  const teams = await Promise.all(seasons.map((season) => apiGet<RawTeam[]>(`/events/${season.id}/teams`)));
  return seasons.map((season, i) => ({ season, teams: teams[i] }));
}

/** The person behind an old name link: the newest season's player whose name
 *  slugs to `slug`, else the newest whose tag, or the tag they played that
 *  season as, has that name part ("belit" for BeLit#11855). Undefined when no
 *  season names it. */
export async function findPlayerBySlug(slug: string): Promise<{ id: number; name: string } | undefined> {
  const { data } = await withFallback(
    async () => {
      const rows = (await fetchSeasonRosters()).flatMap(({ season, teams }) => {
        const key = String(season.id);
        return teams.flatMap((t) => [...(t.player_by_season?.[key] ?? []), ...(t.captains_by_season?.[key] ?? [])]);
      });
      const hit = rows.find((p) => slugMatch(p, slug) === "name") ?? rows.find((p) => slugMatch(p, slug) === "tag");
      return hit ? { id: hit.id, name: hit.name } : null;
    },
    () => null,
    "findPlayerBySlug",
  );
  return data ?? undefined;
}

/** A player's page, by user id: the person with their tags, their roster and
 *  captain seats, career stats, and their series in every published GNL
 *  season they have a roster seat in. Undefined when no published season
 *  holds the id. Every read here is cached an hour. */
export async function getPlayerProfile(userId: number): Promise<PlayerProfile | undefined> {
  const { data } = await withFallback(
    async () => {
      const hour = { revalidate: 3600 };
      const [seasons, user, seats, career] = await Promise.all([
        fetchCompletedSeasonsRaw(),
        apiGet<RawUser>(`/users/${userId}`, hour).catch(notFound(null)),
        apiGet<RawUserSeason[]>(`/users/${userId}/seasons`, hour),
        apiGet<RawCareerStat>(`/stats/career/${userId}`, hour).catch(notFound(null)),
      ]);
      if (!user) return null;
      const published = new Set(seasons.map((s) => s.id));
      const eventIds = seats.filter((r) => r.team && !r.captain_only && published.has(r.season_id)).map((r) => r.season_id);
      const series = eventIds.length
        ? await apiGetAll<RawUserSeries>(`/users/${userId}/series`, { ...hour, query: { event_id: eventIds } })
        : [];
      return mapPlayerProfile({ seasons, user, seats, series, career }) ?? null;
    },
    () => null,
    "getPlayerProfile",
  );
  return data ?? undefined;
}

/** A catch handler that answers `value` for a 404 and rethrows anything else. */
const notFound =
  <T>(value: T) =>
  (err: unknown): T => {
    if (err instanceof ApiError && err.status === 404) return value;
    throw err;
  };

export async function getPlayers(seasonNumber?: number): Promise<{
  players: Player[];
  source: DataSource;
}> {
  const { data, source } = await withFallback(
    async () => {
      const s = await fetchSeasonRaw(seasonNumber);
      const teams = await apiGet<RawTeam[]>(`/events/${s.id}/teams`);
      return flattenPlayers(mapTeams(teams, s));
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
      return mapLadder(ladder, teams, s.maps);
    },
    () => null,
    "getLadder",
  );
  return { ladder: data, source };
}
