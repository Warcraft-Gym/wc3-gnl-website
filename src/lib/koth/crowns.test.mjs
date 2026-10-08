import { test } from "node:test";
import assert from "node:assert/strict";
import { mostCrowns, topFirst } from "./crowns.mjs";

test("a night's crowns read strongest bracket first whatever the stored order", () => {
  const order = (labels) => topFirst(labels.map((bracket) => ({ bracket, player: bracket }))).map((w) => w.bracket);
  assert.deepEqual(order(["1450 and Below", "1450 to 1600", "1600 to the mooon"]), ["1600 to the mooon", "1450 to 1600", "1450 and Below"]);
  assert.deepEqual(order(["under 1450 MMR", "1600 MMR and up", "1450 to 1599 MMR"]), ["1600 MMR and up", "1450 to 1599 MMR", "under 1450 MMR"]);
  assert.deepEqual(order(["Gold and below", "Platinum to 1700 MMR"]), ["Platinum to 1700 MMR", "Gold and below"]);
});

test("the crown count takes a name as stored: Elu and elu are two players, a night with no date does not count", () => {
  const out = mostCrowns([
    { date: "2026-01-10", winners: [{ bracket: "a", player: "Elu" }, { bracket: "b", player: "elu" }, { bracket: "c", player: "Glaive" }] },
    { date: "2024-03-02", winners: [{ bracket: "a", player: "Elu" }, { bracket: "b", player: "Glaive" }] },
    { date: null, winners: [{ bracket: "a", player: "Nobody" }] },
  ]);
  assert.deepEqual(out, [
    { player: "Elu", crowns: 2, first: "2024", last: "2026" },
    { player: "Glaive", crowns: 2, first: "2024", last: "2026" },
    { player: "elu", crowns: 1, first: "2026", last: "2026" },
  ]);
});
