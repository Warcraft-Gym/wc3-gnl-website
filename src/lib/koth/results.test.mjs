import { test } from "node:test";
import assert from "node:assert/strict";
import { bracketLabel, toResults } from "./results.mjs";

test("a night the app ran names its brackets by MMR band; the archive keeps its own labels", () => {
  const out = toResults([
    {
      event_id: 22,
      date: "2026-10-03",
      winners: [
        { bracket: "Bracket 3", lower_bound: 1600, name: "Jinvvar", user_id: 7, country: "DE" },
        { bracket: "Bracket 2", lower_bound: 1450, name: null },
        { bracket: "Bracket 1", lower_bound: 0, name: "Superfurion" },
      ],
    },
    { event_id: 170, date: "2026-01-10", winners: [{ bracket: "1600 to the mooon", lower_bound: null, name: "Glaive#1234 ", user_id: null, country: null }] },
    { event_id: 9, date: null, winners: [{ bracket: "x", name: "Nobody" }] },
  ]);
  assert.deepEqual(out, [
    { id: 22, date: "2026-10-03", winners: [
        { bracket: "1600 MMR and up", player: "Jinvvar", userId: 7, country: "DE" },
        { bracket: "under 1450 MMR", player: "Superfurion", userId: null, country: null },
      ],
    },
    { id: 170, date: "2026-01-10", winners: [{ bracket: "1600 to the mooon", player: "Glaive", userId: null, country: null }] },
  ]);
  assert.equal(bracketLabel("Bracket 2", 1450, [0, 1450, 1600]), "1450 to 1599 MMR");
});
