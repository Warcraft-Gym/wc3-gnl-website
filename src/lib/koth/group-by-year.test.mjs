import { test } from "node:test";
import assert from "node:assert/strict";
import { groupByYear, shortDate } from "./group-by-year.mjs";

const r = (date, n = 1) => ({ date, winners: Array.from({ length: n }, (_, i) => ({ bracket: `b${i}`, player: `p${i}` })) });

test("groups newest year first and keeps each year's order", () => {
  const out = groupByYear([r("2026-01-10"), r("2025-12-27"), r("2025-01-04"), r("2021-05-22")]);
  assert.deepEqual(out.map((g) => g.year), ["2026", "2025", "2021"]);
  assert.deepEqual(out[1].results.map((x) => x.date), ["2025-12-27", "2025-01-04"]);
});

test("counts crownings per year, not events", () => {
  const out = groupByYear([r("2026-01-10", 3), r("2026-01-03", 2)]);
  assert.equal(out[0].results.length, 2);
  assert.equal(out[0].crownings, 5);
});

test("an event with no winners still appears, counting zero", () => {
  const out = groupByYear([{ date: "2025-07-17", winners: [] }]);
  assert.equal(out[0].results.length, 1);
  assert.equal(out[0].crownings, 0);
});

test("a 1 January event files under its own year, not the previous one", () => {
  const out = groupByYear([r("2026-01-01"), r("2025-12-31")]);
  assert.deepEqual(out.map((g) => g.year), ["2026", "2025"]);
});

test("a junk date is dropped rather than making a junk year", () => {
  const out = groupByYear([r("2026-01-10"), { date: "soon", winners: [] }, { winners: [] }]);
  assert.deepEqual(out.map((g) => g.year), ["2026"]);
});

test("a non-array is handled", () => {
  assert.deepEqual(groupByYear(null), []);
});

test("shortDate reads as a day and month, in UTC", () => {
  assert.equal(shortDate("2026-01-10"), "10 Jan");
  assert.equal(shortDate("2021-05-22"), "22 May");
  assert.equal(shortDate("nonsense"), "nonsense");
});
