import "server-only";

import { apiGet, withFallback } from "./client";
import {
  FIXTURE_SEASON,
  FIXTURE_TEAMS,
  FIXTURE_PLAYERS,
  FIXTURE_STANDINGS,
  FIXTURE_WEEKS,
  FIXTURE_FIXTURES,
  FIXTURE_LEADERBOARD,
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
  mapEventLeaderboard,
  mapFantasy,
  type RawSeason,
  type RawTeam,
  type RawSeries,
  type RawFantasyTeam,
} from "./mappers";
import type {
  Season,
  Team,
  Player,
  StandingRow,
  Week,
  TeamFixture,
  LeaderboardRow,
  FantasyEntry,
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

interface RawLeague {
  id: number;
  kind: string;
}

/**
 * The GNL event every page reads. For now this is the newest finished one:
 * a choice for this phase, not a rule of the data. A running season could be
 * shown the same way. The intended end state is a landing page that switches
 * on the season's phase (signups open, commenced, complete); that logic is
 * deferred until it is the focus.
 */
async function fetchActiveSeasonRaw(): Promise<RawSeason> {
  const leagues = await apiGet<RawLeague[]>("/leagues");
  const league = leagues.find((row) => row.kind === "gnl");
  if (!league) throw new Error("The GNL league is not configured.");
  const events = await apiGet<RawSeason[]>("/events", {
    query: { league_id: league.id, published: "true" },
  });
  const completed = events.filter((event) => event.phase === "finished");
  if (!completed.length) throw new Error("The GNL has no completed event.");
  return pickActiveSeason(completed);
}

export async function getActiveSeason(): Promise<Season> {
  const { data } = await withFallback(
    async () => mapSeason(await fetchActiveSeasonRaw()),
    () => FIXTURE_SEASON,
    "getActiveSeason",
  );
  return data;
}

export async function getWeeks(): Promise<{ weeks: Week[]; source: DataSource }> {
  const { data, source } = await withFallback(
    async () => deriveWeeks(mapSeason(await fetchActiveSeasonRaw())),
    () => FIXTURE_WEEKS,
    "getWeeks",
  );
  return { weeks: data, source };
}

export async function getFixtures(): Promise<{
  fixtures: TeamFixture[];
  source: DataSource;
}> {
  const { data, source } = await withFallback(
    async () => {
      const s = await fetchActiveSeasonRaw();
      const series = await apiGet<RawSeries[]>(`/events/${s.id}/series`);
      return mapFixtures(series);
    },
    () => FIXTURE_FIXTURES,
    "getFixtures",
  );
  return { fixtures: data, source };
}

export async function getWeekFixtures(week: number): Promise<{
  week: Week | undefined;
  fixtures: TeamFixture[];
  source: DataSource;
}> {
  const [{ weeks }, { fixtures, source }] = await Promise.all([
    getWeeks(),
    getFixtures(),
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

export async function getStandings(): Promise<{
  rows: StandingRow[];
  source: DataSource;
}> {
  const { data, source } = await withFallback(
    async () => {
      const s = await fetchActiveSeasonRaw();
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

export async function getTeams(): Promise<{ teams: Team[]; source: DataSource }> {
  const { data, source } = await withFallback(
    async () => {
      const s = await fetchActiveSeasonRaw();
      const teams = await apiGet<RawTeam[]>(`/events/${s.id}/teams`);
      return mapTeams(teams, s.id);
    },
    () => FIXTURE_TEAMS,
    "getTeams",
  );
  return { teams: data, source };
}

export async function getTeamBySlug(slug: string): Promise<Team | undefined> {
  const { teams } = await getTeams();
  return teams.find((t) => t.slug === slug);
}

export async function getPlayers(): Promise<{
  players: Player[];
  source: DataSource;
}> {
  const { data, source } = await withFallback(
    async () => {
      const s = await fetchActiveSeasonRaw();
      const teams = await apiGet<RawTeam[]>(`/events/${s.id}/teams`);
      return flattenPlayers(mapTeams(teams, s.id));
    },
    () => FIXTURE_PLAYERS,
    "getPlayers",
  );
  return { players: data, source };
}

export async function getLeaderboard(): Promise<{
  rows: LeaderboardRow[];
  source: DataSource;
}> {
  const { data, source } = await withFallback(
    async () => {
      const s = await fetchActiveSeasonRaw();
      const teams = await apiGet<RawTeam[]>(`/events/${s.id}/teams`);
      return mapEventLeaderboard(teams, s.id);
    },
    () => FIXTURE_LEADERBOARD,
    "getLeaderboard",
  );
  return { rows: data, source };
}

export async function getFantasy(): Promise<{
  entries: FantasyEntry[];
  source: DataSource;
}> {
  const { data, source } = await withFallback(
    async () => {
      const s = await fetchActiveSeasonRaw();
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
