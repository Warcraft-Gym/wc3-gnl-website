import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRouteQuery } from "./query.mjs";

const catalogue = {
  raceIds: ["human", "orc", "nightelf", "undead"],
  levelIds: ["standard", "beginner"],
  mapSlugs: ["autumn-leaves", "echo-isles"],
};

test("valid params all come through", () => {
  const result = parseRouteQuery({ race: "orc", vs: "human", level: "beginner", map: "echo-isles" }, catalogue);
  assert.deepEqual(result, { race: "orc", vsRace: "human", level: "beginner", map: "echo-isles" });
});

test("an unknown race is silently ignored, not an error (?race=elf)", () => {
  const result = parseRouteQuery({ race: "elf" }, catalogue);
  assert.equal(result.race, undefined);
});

test("an unknown vs is silently ignored", () => {
  const result = parseRouteQuery({ vs: "elf" }, catalogue);
  assert.equal(result.vsRace, undefined);
});

test("an unknown level is silently ignored", () => {
  const result = parseRouteQuery({ level: "expert" }, catalogue);
  assert.equal(result.level, undefined);
});

test("an unknown map slug is silently ignored", () => {
  const result = parseRouteQuery({ map: "not-a-real-map" }, catalogue);
  assert.equal(result.map, undefined);
});

test("no params at all returns everything undefined", () => {
  const result = parseRouteQuery({}, catalogue);
  assert.deepEqual(result, { race: undefined, vsRace: undefined, level: undefined, map: undefined });
});

test("null/empty-string params are treated as absent", () => {
  const result = parseRouteQuery({ race: "", vs: null, level: undefined, map: "" }, catalogue);
  assert.deepEqual(result, { race: undefined, vsRace: undefined, level: undefined, map: undefined });
});
