import { test } from "node:test";
import assert from "node:assert/strict";
import { currentKings } from "./current-kings.mjs";

const king = (bracket, player) => ({ bracket, player });

test("the kings are the winners of the newest recorded event", () => {
  const out = currentKings([
    { date: "2026-09-27", winners: [king("1600 to 1750 MMR", "RandomBadGamer"), king("1450 and below", "Screwin")] },
    { date: "2026-01-10", winners: [king("1600+", "Glaive")] },
  ]);
  assert.equal(out.date, "2026-09-27");
  assert.deepEqual(out.kings.map((k) => k.player), ["RandomBadGamer", "Screwin"]);
});

test("an event with no winners recorded is skipped, not shown blank", () => {
  // Ten events in the archive are like this: matches listed, no crowning.
  const out = currentKings([
    { date: "2026-09-27", winners: [] },
    { date: "2026-01-10", winners: [king("1600+", "Glaive")] },
  ]);
  assert.equal(out.date, "2026-01-10");
  assert.deepEqual(out.kings, [king("1600+", "Glaive")]);
});

test("order is the order the winners were entered", () => {
  const out = currentKings([
    { date: "2026-09-27", winners: [king("1450 and below", "Screwin"), king("1600 to 1750 MMR", "RandomBadGamer")] },
  ]);
  assert.deepEqual(out.kings.map((k) => k.bracket), ["1450 and below", "1600 to 1750 MMR"]);
});

test("a list in the wrong order still crowns the newest", () => {
  const out = currentKings([
    { date: "2025-01-01", winners: [king("1600+", "Old")] },
    { date: "2026-09-27", winners: [king("1600+", "New")] },
  ]);
  assert.equal(out.kings[0].player, "New");
});

test("half-written winners are dropped rather than rendered empty", () => {
  const out = currentKings([
    { date: "2026-09-27", winners: [{ bracket: "1600+" }, { player: "Nameless" }, king("1450 and below", "Screwin")] },
  ]);
  assert.deepEqual(out.kings, [king("1450 and below", "Screwin")]);
});

test("no results, or none with a winner, is null", () => {
  assert.equal(currentKings([]), null);
  assert.equal(currentKings([{ date: "2026-09-27", winners: [] }]), null);
  assert.equal(currentKings(null), null);
});
