import assert from "node:assert/strict";
import test from "node:test";
import { missingTime, missingTimeLines } from "./match-time.mjs";

test("a series still to come promises a time", () => {
  assert.equal(missingTime(false), "TBD");
  assert.deepEqual(missingTimeLines(false), { day: "TBD", time: "" });
});

test("a series already played never had its time written down", () => {
  assert.equal(missingTime(true), "Not recorded");
  assert.deepEqual(missingTimeLines(true), { day: "Not", time: "recorded" });
});
