import assert from "node:assert/strict";
import test from "node:test";
import { mainRace } from "./races.mjs";

const row = (race, mmr, games) => ({ race, mmr, games });

test("the main race has the highest MMR among races of ten games", () => {
  const races = [row("orc", 1080, 242), row("undead", 1005, 44), row("nightelf", 982, 74)];
  assert.equal(mainRace(races, "human"), "orc");
});

test("a short run of games does not claim the main race", () => {
  const races = [row("human", 1400, 4), row("orc", 1080, 242)];
  assert.equal(mainRace(races, "human"), "orc");
});

test("with no race at ten games the highest MMR of all wins", () => {
  const races = [row("human", 1400, 4), row("orc", 1200, 9)];
  assert.equal(mainRace(races, "undead"), "human");
});

test("with no ladder games it is the profile race", () => {
  assert.equal(mainRace([], "nightelf"), "nightelf");
  assert.equal(mainRace([row("orc", 1080, 0)], "nightelf"), "nightelf");
});
