import assert from "node:assert/strict";
import test from "node:test";
import { mainRace } from "./races.mjs";

const row = (race, mmr, games) => ({ race, mmr, games });

test("the main race has the highest MMR among races of ten games", () => {
  const races = [row("orc", 1080, 242), row("undead", 1005, 44), row("nightelf", 982, 74)];
  assert.equal(mainRace(races), "orc");
});

test("a short run of games does not claim the main race", () => {
  const races = [row("human", 1400, 4), row("orc", 1080, 242)];
  assert.equal(mainRace(races), "orc");
});

test("with no race at ten games there is no main race", () => {
  const races = [row("human", 1400, 4), row("orc", 1200, 9)];
  assert.equal(mainRace(races), null);
});

test("an exact MMR tie goes to the more played race", () => {
  const races = [row("undead", 1100, 30), row("orc", 1100, 90)];
  assert.equal(mainRace(races), "orc");
  assert.equal(mainRace([...races].reverse()), "orc");
});

test("exactly ten games clears the floor", () => {
  const races = [row("human", 1400, 10), row("orc", 1080, 242)];
  assert.equal(mainRace(races), "human");
});

test("with no ladder rows there is no main race", () => {
  assert.equal(mainRace([]), null);
  assert.equal(mainRace([row("orc", 1080, 0)]), null);
});
