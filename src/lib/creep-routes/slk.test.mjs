import assert from "node:assert/strict";
import test from "node:test";
import { parseSlk, cell, columnIndex, indexByColumn } from "./slk.mjs";

// A tiny inline SYLK sample: header row (X-before-Y), a data row with
// Y-before-X on its first cell then bare X on the rest (Y persisting), and
// a second data row exercising the same. Mixed quoted-string and bare
// numeric values, matching what unitbalance.slk/unitdata.slk actually do.
const SAMPLE = [
  "ID;PWXL;N;E",
  "B;X3;Y3;D0",
  'C;X1;Y1;K"unitBalanceID"',
  'C;X2;K"level"',
  'C;X3;K"comment(s)"',
  'C;Y2;X1;K"nftt"',
  "C;X2;K2",
  'C;X3;K"Forest Troll"',
  'C;X1;Y3;K"nmrl"',
  "C;X2;K1",
  'C;X3;K"Murloc"',
].join("\n");

test("parses cells and looks them up by row/column", () => {
  const table = parseSlk(SAMPLE);
  assert.equal(cell(table, 1, 1), "unitBalanceID");
  assert.equal(cell(table, 2, 1), "nftt");
  assert.equal(cell(table, 2, 2), "2");
  assert.equal(cell(table, 3, 1), "nmrl");
  assert.equal(cell(table, 3, 2), "1");
});

test("strips quotes from quoted values, keeps bare values as raw strings", () => {
  const table = parseSlk(SAMPLE);
  assert.equal(cell(table, 2, 3), "Forest Troll"); // quoted -> unquoted
  assert.equal(cell(table, 2, 2), "2"); // bare token -> unchanged string
});

test("X/Y order on a line does not matter, and a bare X reuses the last Y", () => {
  const table = parseSlk(SAMPLE);
  // Row 2's first cell writes Y before X ("C;Y2;X1;..."); its next two
  // cells omit Y entirely and must still land on row 2.
  assert.equal(cell(table, 2, 1), "nftt");
  assert.equal(cell(table, 2, 2), "2");
  assert.equal(cell(table, 2, 3), "Forest Troll");
});

test("columnIndex reads the header row's column names", () => {
  const table = parseSlk(SAMPLE);
  const columns = columnIndex(table);
  assert.equal(columns.get("unitBalanceID"), 1);
  assert.equal(columns.get("level"), 2);
  assert.equal(columns.get("comment(s)"), 3);
});

test("indexByColumn keys every data row by the given column, excluding the header row", () => {
  const table = parseSlk(SAMPLE);
  const byId = indexByColumn(table, "unitBalanceID");
  assert.equal(byId.size, 2);
  assert.deepEqual(byId.get("nftt"), { unitBalanceID: "nftt", level: "2", "comment(s)": "Forest Troll" });
  assert.deepEqual(byId.get("nmrl"), { unitBalanceID: "nmrl", level: "1", "comment(s)": "Murloc" });
  assert.equal(byId.get("does-not-exist"), undefined);
});
