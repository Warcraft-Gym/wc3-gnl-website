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

test("an exact MMR tie goes to the more played race", () => {
  const races = [row("undead", 1100, 30), row("orc", 1100, 90)];
  assert.equal(mainRace(races, "human"), "orc");
  assert.equal(mainRace([...races].reverse(), "human"), "orc");
});

test("exactly ten games clears the floor", () => {
  const races = [row("human", 1400, 10), row("orc", 1080, 242)];
  assert.equal(mainRace(races, "orc"), "human");
});

test("with no ladder games it is the signup race", () => {
  assert.equal(mainRace([], "nightelf"), "nightelf");
  assert.equal(mainRace([row("orc", 1080, 0)], "nightelf"), "nightelf");
});
