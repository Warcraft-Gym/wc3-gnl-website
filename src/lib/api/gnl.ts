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
} from "./fixtures";
import {
  pickActiveSeason,
  mapSeason,
  deriveWeeks,
  mapTeams,
  flattenPlayers,
  mapFixtures,
  mapStandings,
  mapLeaderboard,
  type RawSeason,
  type RawTeam,
  type RawSeries,
  type RawCareerStat,
} from "./mappers";
import type {
  Season,
  Team,
  Player,
  StandingRow,
  Week,
  TeamFixture,
  LeaderboardRow,
} from "./types";

/**
 * Public data access for the Warcraft-Gym site.
 *
 * Each function calls the GNL FastAPI backend (via the server-only client) and
 * maps the response to the frontend domain types; on any failure — or when
 * GNL_API_BASE_URL is unset — it falls back to fixtures. See mappers.ts for the
 * backend→domain mapping.
 */

export type DataSource = "live" | "fixture";

/** The active (latest) season's raw record — the root of every season-scoped read. */
async function fetchActiveSeasonRaw(): Promise<RawSeason> {
  const seasons = await apiGet<RawSeason[]>("/seasons");
  return pickActiveSeason(seasons);
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
      const series = await apiGet<RawSeries[]>(`/series/season/${s.id}`);
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
        apiGet<RawTeam[]>(`/teams/season/${s.id}`),
        apiGet<RawSeries[]>(`/series/season/${s.id}`),
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
      const teams = await apiGet<RawTeam[]>(`/teams/season/${s.id}`);
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
      const teams = await apiGet<RawTeam[]>(`/teams/season/${s.id}`);
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
      const stats = await apiGet<RawCareerStat[]>("/stats/career", {
        query: { season_id: s.id },
      });
      return mapLeaderboard(stats);
    },
    () => FIXTURE_LEADERBOARD,
    "getLeaderboard",
  );
  return { rows: data, source };
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
