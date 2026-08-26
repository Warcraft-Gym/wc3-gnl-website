import type {
  Season,
  Team,
  Player,
  StandingRow,
  Week,
  TeamFixture,
  PlayerMatch,
  FixtureTeam,
  LeaderboardRow,
  MatchStatus,
  FantasyEntry,
} from "./types";
import type { Race } from "@/lib/utils";
import { slugify } from "@/lib/utils";

/**
 * Fixture data — a believable snapshot of a GNL season, shaped to match the
 * live site: weeks → team-vs-team fixtures (aggregate score) → player games.
 * Names are original community-style handles (not real persons). Deterministic:
 * no Date.now()/random, so previews and snapshots are stable.
 */

const DAY = 86_400_000;
const SEASON_START = Date.parse("2026-06-01T00:00:00.000Z"); // a Monday
const TOTAL_WEEKS = 7;
const CURRENT_WEEK = 4;

export const FIXTURE_SEASON: Season = {
  id: 18,
  name: "Gym Newbie League — Season 18",
  shortName: "GNL 18",
  slug: "gnl-18",
  isActive: true,
  currentWeek: CURRENT_WEEK,
  totalWeeks: TOTAL_WEEKS,
  startDate: new Date(SEASON_START).toISOString(),
  endDate: new Date(SEASON_START + TOTAL_WEEKS * 7 * DAY).toISOString(),
};

type RawPlayer = [name: string, race: Race, mmr: number, country: string];

const ROSTERS: Record<string, RawPlayer[]> = {
  "GNL Bears": [
    ["Moonfang", "nightelf", 1980, "SE"],
    ["Thistlebloom", "nightelf", 1740, "DE"],
    ["QuietArrow", "random", 1610, "NL"],
  ],
  "Acolytes Anonymous": [
    ["ColdLogic", "undead", 2010, "RU"],
    ["FigureFour", "undead", 1755, "UA"],
    ["GhoulGosu", "random", 1625, "FI"],
  ],
  "Saul's Angels": [
    ["SirLatency", "human", 1955, "GB"],
    ["TowerRush", "human", 1720, "DE"],
    ["MilitiaMike", "random", 1600, "CA"],
  ],
  "Moonjuice Moonshiners": [
    ["GrommDrip", "orc", 1990, "PL"],
    ["SaltyPeon", "orc", 1690, "FR"],
    ["WolfRider88", "random", 1580, "US"],
  ],
  Sheepapult: [
    ["Footman4Life", "human", 1830, "IE"],
    ["Griffonlord", "human", 1660, "ES"],
    ["Pocketed", "random", 1540, "PT"],
  ],
  "Crit Happens": [
    ["Bloodlust", "orc", 1875, "BR"],
    ["Shadowmeld", "nightelf", 1700, "AR"],
    ["MicroDose", "random", 1560, "CL"],
  ],
  "Giggling Goblins": [
    ["Kael", "human", 1810, "IT"],
    ["ArcaneAlex", "human", 1645, "GR"],
    ["ManaBurn", "random", 1520, "TR"],
  ],
  Druglords: [
    ["LichKing", "undead", 1860, "NO"],
    ["Nerubian", "undead", 1680, "DK"],
    ["FrostyGG", "random", 1500, "IS"],
  ],
};

// Real team tags (from the GNL backend). Falls back to derived initials.
const TAGS: Record<string, string> = {
  "GNL Bears": "GNLB",
  "Acolytes Anonymous": "AA",
  "Saul's Angels": "SA",
  "Moonjuice Moonshiners": "MJM",
  Sheepapult: "BAA",
  "Crit Happens": "CRIT",
  "Giggling Goblins": "GG",
  Druglords: "DL",
};

function makeTag(name: string): string {
  const words = name.replace(/'/g, "").split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 4);
}

export const FIXTURE_TEAMS: Team[] = Object.entries(ROSTERS).map(
  ([name, roster], ti) => {
    const players: Player[] = roster.map(([pn, race, mmr, country], pi) => ({
      id: ti * 10 + pi + 1,
      name: pn,
      slug: slugify(pn),
      battleTag: `${pn}#${1000 + ti * 7 + pi}`,
      race,
      mmr,
      country,
      teamId: ti + 1,
      teamName: name,
    }));
    const slug = slugify(name);
    return {
      id: ti + 1,
      name,
      slug,
      tag: TAGS[name] ?? makeTag(name),
      logoUrl: `/team-logos/${slug}.png`,
      captainId: players[0]?.id,
      players,
    };
  },
);

export const FIXTURE_PLAYERS: Player[] = FIXTURE_TEAMS.flatMap((t) => t.players);

const teamByIndex = (i: number) => FIXTURE_TEAMS[i];

// --- Round-robin pairings (circle method) for 8 teams across the weeks. ---
function roundRobin(nTeams: number, weeks: number): [number, number][][] {
  const arr = Array.from({ length: nTeams }, (_, i) => i);
  const rounds: [number, number][][] = [];
  for (let w = 0; w < weeks; w++) {
    const pairs: [number, number][] = [];
    for (let i = 0; i < nTeams / 2; i++) {
      const a = arr[i];
      const b = arr[nTeams - 1 - i];
      // alternate home/away by week for variety
      pairs.push(w % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    // rotate keeping first fixed
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    arr.splice(0, arr.length, fixed, ...rest);
  }
  return rounds;
}

// Deterministic Bo3 result from a seed.
const BO3: [number, number][] = [
  [2, 0],
  [2, 1],
  [1, 2],
  [0, 2],
  [2, 1],
];

function weekLabel(startMs: number): string {
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const dayOnly = new Intl.DateTimeFormat("en-US", { day: "numeric" });
  const start = fmt.format(new Date(startMs));
  const end = dayOnly.format(new Date(startMs + 6 * DAY));
  return `${start} – ${end}`;
}

export const FIXTURE_WEEKS: Week[] = Array.from(
  { length: TOTAL_WEEKS },
  (_, i) => {
    const number = i + 1;
    const startMs = SEASON_START + i * 7 * DAY;
    return {
      number,
      label: weekLabel(startMs),
      startDate: new Date(startMs).toISOString(),
      endDate: new Date(startMs + 6 * DAY).toISOString(),
      isCurrent: number === CURRENT_WEEK,
    };
  },
);

function buildPlayerMatches(
  homeTeam: Team,
  awayTeam: Team,
  fixtureStartMs: number,
  seedBase: number,
  fixtureStatus: MatchStatus,
): { matches: PlayerMatch[]; homeScore: number; awayScore: number } {
  const matches: PlayerMatch[] = [];
  let homeScore = 0;
  let awayScore = 0;
  let g = 0;
  // 3x3 cross games between the two rosters.
  for (let h = 0; h < homeTeam.players.length; h++) {
    for (let a = 0; a < awayTeam.players.length; a++) {
      const hp = homeTeam.players[h];
      const ap = awayTeam.players[a];
      const seed = seedBase + g * 3;
      const [hs, as] = BO3[seed % BO3.length];

      // Per-game status derived from fixture status.
      let status: MatchStatus = "scheduled";
      let hScore = 0;
      let aScore = 0;
      if (fixtureStatus === "completed") {
        status = "completed";
        hScore = hs;
        aScore = as;
      } else if (fixtureStatus === "live") {
        if (g < 4) {
          status = "completed";
          hScore = hs;
          aScore = as;
        } else if (g === 4) {
          status = "live";
          hScore = 1;
          aScore = 1;
        }
      }

      homeScore += hScore;
      awayScore += aScore;

      const at = new Date(
        fixtureStartMs + g * 35 * 60_000,
      ).toISOString();
      matches.push({
        id: seedBase * 100 + g,
        scheduledAt: at,
        status,
        home: {
          playerId: hp.id,
          playerName: hp.name,
          race: hp.race,
          score: hScore,
        },
        away: {
          playerId: ap.id,
          playerName: ap.name,
          race: ap.race,
          score: aScore,
        },
        hasReplays: status === "completed",
      });
      g++;
    }
  }
  return { matches, homeScore, awayScore };
}

function fixtureTeam(t: Team, score: number): FixtureTeam {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    tag: t.tag!,
    logoUrl: t.logoUrl,
    score,
  };
}

export const FIXTURE_FIXTURES: TeamFixture[] = (() => {
  const rounds = roundRobin(FIXTURE_TEAMS.length, TOTAL_WEEKS);
  const out: TeamFixture[] = [];
  let id = 500;

  rounds.forEach((pairs, wi) => {
    const week = wi + 1;
    const weekStart = SEASON_START + wi * 7 * DAY;
    pairs.forEach((pair, pi) => {
      const home = teamByIndex(pair[0]);
      const away = teamByIndex(pair[1]);

      // Fixture status by week position.
      let status: MatchStatus;
      if (week < CURRENT_WEEK) status = "completed";
      else if (week > CURRENT_WEEK) status = "scheduled";
      else status = pi === 0 ? "live" : pi === 1 ? "completed" : "scheduled";

      // Fixtures spread Fri/Sat/Sun evening of the week.
      const fixtureStart =
        weekStart + (4 + (pi % 3)) * DAY + (19 + (pi % 2)) * 3_600_000;

      const { matches, homeScore, awayScore } = buildPlayerMatches(
        home,
        away,
        fixtureStart,
        week * 100 + pi * 13 + 1,
        status,
      );

      out.push({
        id: id++,
        week,
        seasonId: FIXTURE_SEASON.id,
        status,
        scheduledAt: new Date(fixtureStart).toISOString(),
        home: fixtureTeam(home, homeScore),
        away: fixtureTeam(away, awayScore),
        matches,
      });
    });
  });

  return out;
})();

// --- Team standings (hand-tuned mid-season table). ---
const RECORDS: Array<[teamName: string, w: number, l: number, md: number, streak: string]> = [
  ["Acolytes Anonymous", 6, 1, 11, "W4"],
  ["Moonjuice Moonshiners", 6, 1, 9, "W2"],
  ["GNL Bears", 5, 2, 6, "W1"],
  ["Saul's Angels", 4, 3, 2, "L1"],
  ["Crit Happens", 3, 4, -1, "W1"],
  ["Sheepapult", 2, 5, -5, "L2"],
  ["Giggling Goblins", 2, 5, -7, "L3"],
  ["Druglords", 1, 6, -14, "L4"],
];

export const FIXTURE_STANDINGS: StandingRow[] = RECORDS.map(
  ([name, wins, losses, mapDiff, streak], i) => {
    const team = FIXTURE_TEAMS.find((t) => t.name === name)!;
    return {
      rank: i + 1,
      team: {
        id: team.id,
        name: team.name,
        slug: team.slug,
        tag: team.tag,
        logoUrl: team.logoUrl,
      },
      played: wins + losses,
      wins,
      losses,
      mapDiff,
      points: wins * 3,
      streak,
    };
  },
);

// --- Individual leaderboard (derived deterministically from MMR ordering). ---
export const FIXTURE_LEADERBOARD: LeaderboardRow[] = [...FIXTURE_PLAYERS]
  .sort((a, b) => (b.mmr ?? 0) - (a.mmr ?? 0))
  .map((p, i) => {
    const played = 14;
    const wins = Math.max(3, 13 - i);
    const losses = played - wins;
    return {
      rank: i + 1,
      player: {
        id: p.id,
        name: p.name,
        slug: p.slug,
        race: p.race,
        teamName: p.teamName,
      },
      played,
      wins,
      losses,
      winrate: Math.round((wins / played) * 100),
      mmr: p.mmr,
    };
  });


// --- Fantasy standings (deterministic managers drafting fixture teams). ---
const FANTASY_MANAGERS = [
  "Micro Managers",
  "Creep Route Cartel",
  "Tower Rush Inc.",
  "Expansion Enjoyers",
  "Hero XP Hoarders",
  "Base Trade Believers",
];

export const FIXTURE_FANTASY: FantasyEntry[] = FANTASY_MANAGERS.map(
  (name, i) => {
    const team = FIXTURE_TEAMS[i % FIXTURE_TEAMS.length];
    const roster = team.players.slice(0, 6);
    const captain = roster[0];
    const player = 130 - i * 12;
    const bench = 60 - i * 6;
    const team_ = 120 - i * 10;
    const race = 55 - i * 5;
    const bet = 25 - i * 3;
    return {
      rank: i + 1,
      id: 900 + i,
      name,
      captain: captain
        ? {
            id: captain.id,
            name: captain.name,
            race: captain.race,
            country: captain.country,
          }
        : undefined,
      draftedTeam: {
        id: team.id,
        name: team.name,
        tag: team.tag ?? makeTag(team.name),
        logoUrl: team.logoUrl,
      },
      draftedRace: (["orc", "human", "nightelf", "undead", "random"] as Race[])[
        i % 5
      ],
      breakdown: { player, bench, team: team_, race, bet },
      total: player + bench + team_ + race + bet,
      roster: roster.map((p) => ({
        id: p.id,
        name: p.name,
        race: p.race,
        isCaptain: p.id === captain?.id,
      })),
    };
  },
);
