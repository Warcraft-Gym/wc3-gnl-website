import type { Race } from "@/lib/utils";

/**
 * Domain model for the public site, structured to mirror the live GNL section:
 * a season runs in weeks; each week has team-vs-team fixtures ("series") with an
 * aggregate score; each fixture expands into individual player games.
 */

export type Season = {
  id: number;
  name: string;
  shortName: string; // e.g. "GNL 18"
  slug: string;
  isActive: boolean;
  currentWeek: number;
  totalWeeks: number;
  startDate?: string;
  endDate?: string;
};

export type Player = {
  id: number;
  name: string;
  slug: string;
  battleTag?: string;
  race: Race;
  mmr?: number;
  country?: string;
  teamId?: number;
  teamName?: string;
};

export type Team = {
  id: number;
  name: string;
  slug: string;
  tag?: string;
  logoUrl?: string;
  captainId?: number;
  players: Player[];
};

export type StandingRow = {
  rank: number;
  team: Pick<Team, "id" | "name" | "slug" | "tag" | "logoUrl">;
  played: number;
  wins: number;
  losses: number;
  mapDiff: number;
  points: number;
  streak?: string;
};

export type MatchStatus = "scheduled" | "live" | "completed";

export type Week = {
  number: number;
  label: string; // "Jul 6 – 12"
  startDate: string;
  endDate: string;
  isCurrent: boolean;
};

/** One side of an individual 1v1 game. */
export type MatchSide = {
  playerId?: number;
  playerName: string;
  race: Race;
  score: number;
};

/** An individual player-vs-player game inside a team fixture. */
export type PlayerMatch = {
  id: number;
  scheduledAt?: string;
  status: MatchStatus;
  home: MatchSide;
  away: MatchSide;
  hasReplays: boolean;
};

/** One team's side of a weekly fixture, with aggregate games won. */
export type FixtureTeam = {
  id: number;
  name: string;
  slug: string;
  tag: string;
  logoUrl?: string;
  score: number;
};

/** A weekly team-vs-team fixture ("series"), aggregate score + player games. */
export type TeamFixture = {
  id: number;
  week: number;
  seasonId: number;
  status: MatchStatus;
  scheduledAt?: string;
  home: FixtureTeam;
  away: FixtureTeam;
  matches: PlayerMatch[];
};

export type LeaderboardRow = {
  rank: number;
  player: Pick<Player, "id" | "name" | "slug" | "race" | "teamName">;
  played: number;
  wins: number;
  losses: number;
  winrate: number;
  mmr?: number;
};

export type BracketMatch = {
  id: number;
  round: number;
  position: number;
  status: MatchStatus;
  home?: { name: string; score?: number; seed?: number };
  away?: { name: string; score?: number; seed?: number };
};

export type Bracket = {
  name: string;
  rounds: { name: string; matches: BracketMatch[] }[];
};
