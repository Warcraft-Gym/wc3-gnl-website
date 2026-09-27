import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("./ts-hooks.mjs", import.meta.url);
const { mapPlayerProfile } = await import("./mappers.ts");

const team = (id, name, long_name) => ({ id, league_id: 1, name, long_name, icon_url: `https://img/${id}.png` });

const reads = {
  seasons: [
    { id: 10, league_id: 1, name: "Season 10", start_date: "2025-01-01" },
    { id: 11, league_id: 1, name: "Season 11", start_date: "2025-06-01" },
  ],
  user: { id: 7, name: "Belit", race_mmrs: [], main_race: null },
  seats: [
    // season 12 is not published, so the page leaves it out
    { season_id: 12, team: team(3, "C", "Gamma"), is_captain: false, captain_only: false, signup_race: "orc", played_as: null, record: { games: 1, wins: 1, losses: 0, matchup_history: ["HU"] } },
    { season_id: 11, team: team(2, "B", "Beta"), is_captain: true, captain_only: true, signup_race: null, played_as: null, record: { games: 0, wins: 0, losses: 0, matchup_history: [] } },
    { season_id: 10, team: team(1, "A", "Alpha"), is_captain: true, captain_only: false, signup_race: "undead", played_as: "Belit#1", record: { games: 2, wins: 1, losses: 1, matchup_history: ["HU", "NE"] } },
  ],
  series: [
    { id: 100, season_id: 10, week: 1, date_time: "2025-01-05T20:00:00Z", race: "UD", score: 2, opponent_score: 1, opponent_id: 8, opponent_name: "Foe", opponent_race: "HU", team1_name: "Alpha", team2_name: "Delta", cast_id: 5, cast_name: "Caster", cast_channel_url: "https://twitch.tv/c", cast_vod_url: "https://vod/1" },
    { id: 101, season_id: 10, week: 2, date_time: "2025-01-12T20:00:00Z", race: null, score: 0, opponent_score: 2, opponent_id: 9, opponent_name: "Elf", opponent_race: "NE", team1_name: "Epsilon", team2_name: "Alpha", cast_id: null, cast_name: null, cast_channel_url: null, cast_vod_url: null },
  ],
  career: { id: 1, user_id: 7, rating: 1500, series_won: 1, series_lost: 1, games_won: 2, games_lost: 3, seasons_played: 1 },
};

test("the profile is built from the seasons, series and career reads", () => {
  const p = mapPlayerProfile(reads);
  assert.deepEqual(p.history.map((h) => h.season.id), [11, 10]);

  const [s11, s10] = p.history;
  assert.equal(s11.captainOnly, true);
  assert.equal(s11.isCaptain, true);
  assert.deepEqual(s11.series, []);
  assert.equal(s10.captainOnly, false);
  assert.equal(s10.isCaptain, true);
  assert.equal(s10.team.name, "Alpha");
  assert.equal(s10.team.logoUrl, "https://img/1.png");
  assert.equal(s10.race, "undead");
  assert.equal(s10.playedAs, "Belit#1");
  assert.deepEqual(s10.record, { seriesPlayed: 2, seriesWon: 1, seriesLost: 1, matchupHistory: ["human", "nightelf"] });
  assert.deepEqual(p.allTime, s10.record);

  const [won, lost] = s10.series;
  assert.equal(won.score, 2);
  assert.equal(won.opponentScore, 1);
  assert.equal(won.status, "completed");
  assert.equal(won.race, "undead");
  assert.deepEqual({ id: won.opponent.id, name: won.opponent.name, race: won.opponent.race }, { id: 8, name: "Foe", race: "human" });
  assert.deepEqual(won.fixture, { homeTeam: "Alpha", awayTeam: "Delta" });
  assert.deepEqual(won.cast, { id: 5, name: "Caster", channelUrl: "https://twitch.tv/c", vodUrl: "https://vod/1" });
  assert.equal(lost.race, "undead", "a series with no race falls back to the signup race");
  assert.equal(lost.cast, undefined);

  assert.equal(p.team.name, "Beta");
  assert.equal(p.career.rating, 1500);
});

test("no career row gives no career", () => {
  assert.equal(mapPlayerProfile({ ...reads, career: null }).career, undefined);
});
