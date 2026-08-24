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
  FIXTURE_BRACKET,
} from "./fixtures";
import type {
  Season,
  Team,
  Player,
  StandingRow,
  Week,
  TeamFixture,
  LeaderboardRow,
  Bracket,
} from "./types";

/**
 * Public data access for the Warcraft-Gym site.
 *
 * Each function attempts a live Flask call and gracefully falls back to
 * fixtures. The `live()` mappers are the single adaptation seam: when the
 * backend's JSON is confirmed (backend blueprints: season/team/series/stats),
 * implement the mapping there — the UI never changes. See docs/ARCHITECTURE.md.
 */

export type DataSource = "live" | "fixture";

export async function getActiveSeason(): Promise<Season> {
  const { data } = await withFallback(
    async () => {
      await apiGet("/seasons");
      throw new Error("season mapping not yet wired");
    },
    () => FIXTURE_SEASON,
    "getActiveSeason",
  );
  return data;
}

export async function getWeeks(): Promise<{ weeks: Week[]; source: DataSource }> {
  const { data, source } = await withFallback(
    async () => {
      await apiGet("/series");
      throw new Error("weeks mapping not yet wired");
    },
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
      await apiGet("/series");
      throw new Error("fixtures mapping not yet wired");
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
      await apiGet("/standings");
      throw new Error("standings mapping not yet wired");
    },
    () => FIXTURE_STANDINGS,
    "getStandings",
  );
  return { rows: data, source };
}

export async function getTeams(): Promise<{ teams: Team[]; source: DataSource }> {
  const { data, source } = await withFallback(
    async () => {
      await apiGet("/teams");
      throw new Error("teams mapping not yet wired");
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
      await apiGet("/users");
      throw new Error("users mapping not yet wired");
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
      await apiGet("/stats");
      throw new Error("leaderboard mapping not yet wired");
    },
    () => FIXTURE_LEADERBOARD,
    "getLeaderboard",
  );
  return { rows: data, source };
}

export async function getBracket(): Promise<{
  bracket: Bracket;
  source: DataSource;
}> {
  const { data, source } = await withFallback(
    async () => {
      await apiGet("/draft-series");
      throw new Error("bracket mapping not yet wired");
    },
    () => FIXTURE_BRACKET,
    "getBracket",
  );
  return { bracket: data, source };
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
