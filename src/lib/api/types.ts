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
  /** The season number, e.g. 18; used in URLs like ?season=18. */
  number: number;
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
  /** The race this player signed up with for the season of this read, with the
   *  legacy profile race as the fallback. It is not the ladder race. */
  race: Race;
  /** Every ladder race with games in the newest W3Champions season that has
   *  rows, sorted by MMR from high to low. */
  races: W3cRaceStat[];
  /** Current W3Champions MMR of the player's main ladder race. */
  mmr?: number;
  country?: string;
  teamId?: number;
  teamName?: string;
  isCaptain?: boolean;
  /** Series record this season, when the roster carries season stats. */
  record?: { wins: number; losses: number };
};

export type Team = {
  id: number;
  name: string;
  slug: string;
  tag?: string;
  logoUrl?: string;
  /** Team captains for the season. Captains often are not on the playing
   *  roster, so they are listed separately from `players`. */
  captains: Pick<Player, "id" | "name" | "slug" | "race" | "country">[];
  players: Player[];
};

export type StandingRow = {
  rank: number;
  team: Pick<Team, "id" | "name" | "slug" | "tag" | "logoUrl">;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  /** Series points for minus against across the season. */
  mapDiff: number;
  /** League points: the sum of series points (4 for a 2-0, 3 for a 2-1, 1 for a 1-2). */
  points: number;
  /** Recent form, e.g. "W3" or "L1"; draws break a streak. */
  streak?: string;
  /** Results in week order, oldest first. */
  form: ("W" | "D" | "L")[];
  /** Captain names for the season. */
  captains: string[];
};

export type MatchStatus = "scheduled" | "live" | "completed";

export type Week = {
  number: number;
  label: string; // "Jul 6 – 12"
  startDate: string;
  endDate: string;
  isCurrent: boolean;
};

/** One side of an individual 1v1 series. */
export type MatchSide = {
  playerId?: number;
  playerName: string;
  /** Race played in this series (may differ from the player's usual race). */
  race: Race;
  score: number;
  /** League points the side earned from this series. */
  points?: number;
};

/** A cast of a series: a streamer's channel and, once added, the VOD. */
export type MatchCast = {
  id: number;
  name: string;
  channelUrl?: string;
  vodUrl?: string;
};

/** An individual player-vs-player series inside a team fixture. */
export type PlayerMatch = {
  id: number;
  scheduledAt?: string;
  status: MatchStatus;
  home: MatchSide;
  away: MatchSide;
  hasReplays: boolean;
  casts: MatchCast[];
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


/** A drafted pick on a fantasy squad. */
export type FantasyPick = {
  id: number;
  name: string;
  race: Player["race"];
  isCaptain: boolean;
};

/** How a fantasy squad's total is composed. */
export type FantasyBreakdown = {
  player: number;
  bench: number;
  team: number;
  race: number;
  bet: number;
};

/** One manager's fantasy squad, ranked within a season. */
export type FantasyEntry = {
  rank: number;
  id: number;
  name: string;
  captain?: { id: number; name: string; race: Player["race"]; country?: string };
  draftedTeam?: { id: number; name: string; tag: string; logoUrl?: string };
  draftedRace: Player["race"];
  breakdown: FantasyBreakdown;
  total: number;
  roster: FantasyPick[];
};


/** W3Champions ladder record for one race in one ladder season. */
export type W3cRaceStat = {
  season: number;
  race: Race;
  mmr: number;
  games: number;
  wins: number;
  losses: number;
};

/** One of the player's series in the selected GNL season, from their side. */
export type PlayerSeries = {
  id: number;
  week: number;
  scheduledAt?: string;
  status: MatchStatus;
  opponent: { id: number; name: string; slug: string; race: Race; teamName?: string };
  race: Race;
  score: number;
  opponentScore: number;
  /** Team fixture the series belongs to. */
  fixture: { homeTeam: string; awayTeam: string };
  cast?: MatchCast;
};

/** A GNL record: series games won and lost, plus the opponent race of each
 *  completed series. */
export type GnlRecord = { games: number; wins: number; losses: number; matchupHistory: Race[] };

/** One GNL season from the player's side: the team they were on, their role
 *  and record, and every series they played. */
export type PlayerSeasonEntry = {
  season: Pick<Season, "id" | "name" | "shortName" | "number">;
  team: Pick<Team, "id" | "name" | "slug" | "tag" | "logoUrl">;
  /** The race the player signed up with for this season. */
  race: Race;
  isCaptain: boolean;
  /** True when the person captained the team without being on its roster. */
  captainOnly: boolean;
  record: GnlRecord;
  series: PlayerSeries[];
};

/** Everything the player page shows. */
export type PlayerProfile = {
  player: Player;
  /** The team from the player's most recent season. */
  team?: Pick<Team, "id" | "name" | "slug" | "tag" | "logoUrl">;
  isCaptain: boolean;
  /** True when the person captains the team but is not on its playing roster. */
  captainOnly: boolean;
  /** The most recent GNL season the player took part in. */
  latestSeason: Pick<Season, "id" | "name" | "shortName" | "number">;
  /** That season's GNL record from the roster stats. */
  season: GnlRecord;
  /** Every published GNL season the player took part in, newest first. */
  history: PlayerSeasonEntry[];
  /** The records above summed over every season in `history`. */
  allTime: GnlRecord;
  /** Current-season W3C rows, one per race, best first. */
  w3c: W3cRaceStat[];
  /** All-time GNL career, when the player has one. */
  career?: {
    rating: number;
    seriesWon: number;
    seriesLost: number;
    gamesWon: number;
    gamesLost: number;
    seasonsPlayed: number;
  };
  /** Series from the most recent season, oldest week first. */
  series: PlayerSeries[];
};

/** The Gym's season ladder challenge: W3Champions games played during the
 *  season earn ladder points and achievements for the player's team. */
export type LadderAchievement = {
  id: string;
  name: string;
  description: string;
  points: number;
  achievedAt?: string;
};

export type LadderPlayer = {
  id: number;
  name: string;
  slug: string;
  race: Race;
  points: number;
  ladderPoints: number;
  games: number;
  wins: number;
  losses: number;
  mmr: { start: number; min: number; max: number; current: number };
  vsRace: Partial<Record<Race, { wins: number; losses: number }>>;
  achievements: LadderAchievement[];
};

export type LadderTeam = {
  id: number;
  name: string;
  slug: string;
  tag?: string;
  logoUrl?: string;
  points: number;
  ladderPoints: number;
  games: number;
  players: LadderPlayer[];
};

export type Ladder = {
  totalGames: number;
  syncedAt?: string;
  /** Games per calendar day across the season. */
  perDay: { date: string; games: number }[];
  rules: LadderAchievement[];
  teams: LadderTeam[];
};
