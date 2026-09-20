import assert from "node:assert/strict";
import test from "node:test";
import { rate, record, resultLabel, signed } from "./figures.mjs";

test("a record under ten played stands alone", () => {
  assert.equal(record(3, 1), "3 – 1");
  assert.equal(record(9, 0), "9 – 0");
});

test("a record carries its percent from ten played", () => {
  assert.equal(record(19, 11), "19 – 11 (63%)");
  assert.equal(record(5, 5), "5 – 5 (50%)");
});

test("nothing played has no record", () => {
  assert.equal(record(0, 0), null);
  assert.equal(record(0, 0, 0), null);
});

test("a record with draws reads W - D - L and carries no percent", () => {
  assert.equal(record(6, 3, 1), "6 – 1 – 3");
  assert.equal(record(12, 8, 0), "12 – 0 – 8");
});

test("a rate is a rounded percent, or null with nothing played", () => {
  assert.equal(rate(19, 11), 63);
  assert.equal(rate(1, 2), 33);
  assert.equal(rate(0, 0), null);
});

test("a signed change keeps its sign and uses the minus sign", () => {
  assert.equal(signed(24), "+24");
  assert.equal(signed(-18), "−18");
  assert.equal(signed(0), "+0");
});

test("a result label names the verb and keeps the own score first", () => {
  assert.equal(resultLabel(2, 1), "Won 2 : 1");
  assert.equal(resultLabel(1, 2), "Lost 1 : 2");
  assert.equal(resultLabel(1, 1), "Drew 1 : 1");
});
