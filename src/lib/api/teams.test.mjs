import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("./ts-hooks.mjs", import.meta.url);
const { mapTeams, mapStandings } = await import("./mappers.ts");

const person = (id, name, signup_race = null) => ({ id, name, battleTag: `${name}#1`, country: "DE", signup_race, played_as: null });
const teams = [
  {
    id: 1,
    league_id: 1,
    name: "A",
    long_name: "Alpha",
    icon_url: "https://img/1.png",
    final_score: 7,
    players: [{ ...person(3, "Ann", "HU"), wins: 2, losses: 1, mmr: 1600 }, { ...person(5, "Bob", "OC"), wins: 0, losses: 0, mmr: null }],
    captains: [person(5, "Bob", "OC")],
  },
];

test("a team summary row maps to a team with its roster and captains", () => {
  const [team] = mapTeams(teams);
  assert.equal(team.name, "Alpha");
  assert.deepEqual(team.players.map((p) => p.id), [5, 3], "a playing captain comes first");
  const [bob, ann] = team.players;
  assert.equal(bob.isCaptain, true);
  assert.equal(bob.mmr, undefined);
  assert.deepEqual(ann.record, { wins: 2, losses: 1 });
  assert.equal(ann.mmr, 1600);
  assert.equal(ann.race, "human");
  assert.deepEqual(ann.tags, []);
  assert.deepEqual(team.captains, [{ id: 5, name: "Bob", slug: bob.slug, race: "orc", country: "DE" }]);
});

test("the standings take the team's final score and captain names", () => {
  const [row] = mapStandings(teams, []);
  assert.equal(row.points, 7);
  assert.deepEqual(row.captains, ["Bob"]);
});
