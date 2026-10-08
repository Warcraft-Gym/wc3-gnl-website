import { test } from "node:test";
import assert from "node:assert/strict";
import { nightBrackets } from "./night-board.mjs";

const p = (name) => ({ name });

test("an archived bracket reads written, inferred and unknown winners newest first", () => {
  const [bracket] = nightBrackets({
    historical: true,
    brackets: [
      {
        division_id: 7,
        name: "1600 to the mooon",
        lower_bound: null,
        historical_king: p("Hastur"),
        history: [
          { series_id: 1, sequence: 1, side1: p("Jinvar"), side2: p("Hastur"), winner_side: null, inferred_winner_side: 2, throne: "moved" },
          { series_id: 2, sequence: 2, side1: p("Hastur"), side2: p("Robotninja"), winner_side: 1, inferred_winner_side: 1, throne: "held", winner_left: true },
          { series_id: 3, sequence: 3, side1: p("Glaive"), side2: p("Sharky"), winner_side: null, inferred_winner_side: null, throne: "none", winner_left: true, review_note: "Neither played on" },
        ],
      },
    ],
  });
  assert.equal(bracket.label, "1600 to the mooon");
  assert.equal(bracket.king, "Hastur");
  assert.deepEqual(
    bracket.rows.map((r) => [r.winner, r.loser, r.undecided, r.inferred, r.withdrew, r.crown, r.note]),
    [
      ["Glaive", "Sharky", true, false, true, null, "Neither played on"],
      ["Hastur", "Robotninja", false, false, true, "Defended the crown", null],
      ["Hastur", "Jinvar", false, true, false, "Took the crown", null],
    ],
  );
});

test("a night the app ran reads its played rows and orders brackets weakest first", () => {
  const out = nightBrackets({
    historical: false,
    brackets: [
      { division_id: 3, name: "Bracket 3", lower_bound: 1600, king: p("Jinvvar"), played: [{ series_id: 9, winner: p("Jinvvar"), loser: p("NightDevil"), throne: "moved", forfeit: false }] },
      { division_id: 1, name: "Bracket 1", lower_bound: 0, king: null, played: [] },
    ],
  });
  assert.deepEqual(out.map((b) => [b.label, b.king, b.rows.length]), [["under 1600 MMR", null, 0], ["1600 MMR and up", "Jinvvar", 1]]);
  assert.equal(out[1].rows[0].crown, "Took the crown");
});
