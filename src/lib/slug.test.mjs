import assert from "node:assert/strict";
import test from "node:test";
import { parsePlayerParam, playerPath } from "./slug.mjs";

test("the param reads the id form, the id alone and a legacy name slug", () => {
  assert.deepEqual(parsePlayerParam("42-thanks"), { id: 42 });
  assert.deepEqual(parsePlayerParam("42-old-name"), { id: 42 });
  assert.deepEqual(parsePlayerParam("42"), { id: 42 });
  assert.deepEqual(parsePlayerParam("thanks"), { slug: "thanks" });
  assert.deepEqual(parsePlayerParam("42thanks"), { slug: "42thanks" });
});

test("the player path carries the id and the name slug", () => {
  assert.equal(playerPath(42, "Thanks Man"), "/gnl/players/42-thanks-man");
  assert.equal(playerPath(42, "Ωμέγα"), "/gnl/players/42");
  assert.equal(playerPath(undefined, "TBD"), "/gnl/players/tbd");
});
