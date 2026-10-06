import { test } from "node:test";
import assert from "node:assert/strict";
import { PLACE_KINDS, actionNamesPlace, atKind, isPin, isWaypoint, kindForClick, placeIds, placeName, placePoint, placeProblem, placeWhere } from "./place.mjs";

const map = {
  starts: [{ player: 1, x: 0.7, y: 0.9 }, { player: 3, x: 0.3, y: 0.1 }],
  mines: [{ x: 0.5, y: 0.5, gold: 12500 }],
  shops: [{ id: "nmrk-6", x: 0.73, y: 0.27 }, { id: "hrdh-1", x: 0.2, y: 0.2 }],
};
const at = (spot, kind = "build") => ({ kind, at: spot });

test("placePoint resolves a start by player, a mine by index, a shop by id, a point as given", () => {
  assert.deepEqual(placePoint(map, at({ start: "3" }, "attack")), map.starts[1]);
  assert.deepEqual(placePoint(map, at({ mine: "0" }, "expand")), map.mines[0]);
  assert.deepEqual(placePoint(map, at({ shop: "nmrk-6" }, "shop")), map.shops[0]);
  assert.deepEqual(placePoint(map, at({ x: 0.25, y: 0.75 })), { x: 0.25, y: 0.75 });
  assert.equal(placePoint(map, at({ start: "9" })), null);
});

test("a point without x and y has no spot on the map", () => {
  assert.equal(placePoint(map, at({})), null);
  assert.equal(placePoint(map, at({ x: 0.5, y: null })), null);
});

test("placeName: your base, their base, a gold mine, the shop's name or shop, on the map", () => {
  assert.equal(placeName(map, at({ start: "1" }), 0), "your base");
  assert.equal(placeName(map, at({ start: "3" }, "attack"), 0), "their base");
  assert.equal(placeName(map, at({ mine: "0" })), "a gold mine");
  assert.equal(placeName(map, at({ shop: "nmrk-6" })), "Marketplace");
  assert.equal(placeName(map, at({ shop: "hrdh-1" })), "shop");
  assert.equal(placeName(map, at({ x: 0.1, y: 0.1 })), "on the map");
});

test("placeWhere, the grey text: a start, mine or shop by name; nothing for a free point or no place", () => {
  assert.equal(placeWhere(map, at({ start: "3" }, "scout"), 0), "their base");
  assert.equal(placeWhere(map, at({ mine: "0" }, "expand")), "a gold mine");
  assert.equal(placeWhere(map, at({ shop: "nmrk-6" }, "shop")), "Marketplace");
  assert.equal(placeWhere(map, at({ x: 0.1, y: 0.1 }, "scout")), "");
  assert.equal(placeWhere(map, undefined), "");
  // An attack keeps its place, at a free point too.
  assert.equal(placeWhere(map, at({ x: 0.1, y: 0.1 }, "attack")), "on the map");
});

test("isPin: a waypoint with the hero flag off; never an attack, a camp or a step with no place", () => {
  assert.equal(isPin({ campId: null, place: at({ start: "3" }, "scout"), hero: false }), true);
  assert.equal(isPin({ campId: null, place: at({ start: "3" }, "scout") }), false);
  assert.equal(isPin({ campId: null, place: at({ start: "3" }, "attack"), hero: false }), false);
  assert.equal(isPin({ campId: "c01", hero: false }), false);
  assert.equal(isPin({ campId: null, action: "TP home", hero: false }), false);
});

test("placeProblem names a spot the map does not have and passes a point", () => {
  const ids = placeIds(map);
  assert.equal(placeProblem(at({ start: "3" }), ids), null);
  assert.match(placeProblem(at({ start: "2" }), ids), /Unknown start/);
  assert.match(placeProblem(at({ mine: "1" }), ids), /Unknown gold mine/);
  assert.match(placeProblem(at({ shop: "ngme-0" }), ids), /Unknown shop/);
  assert.equal(placeProblem(at({ x: 0.5, y: 0.5 }), ids), null);
  assert.equal(placeProblem(at({ shop: "anything" }), {}), null);
});

test("attack is a numbered stop; every other kind is a waypoint", () => {
  assert.equal(isWaypoint({ campId: null, place: at({ start: "3" }, "attack") }), false);
  for (const kind of ["build", "expand", "shop", "scout"]) assert.equal(isWaypoint({ campId: null, place: at({ x: 0.1, y: 0.1 }, kind) }), true);
  assert.equal(isWaypoint({ campId: "c1" }), false);
  assert.equal(atKind({ mine: "0" }), "mine");
});

test("a builder click picks the kind: enemy start attack, own start build, mine expand, shop shop, point build", () => {
  assert.equal(kindForClick({ start: "3" }, "1"), "attack");
  assert.equal(kindForClick({ start: "1" }, "1"), "build");
  assert.equal(kindForClick({ mine: "0" }, "1"), "expand");
  assert.equal(kindForClick({ shop: "nmrk-6" }, "1"), "shop");
  assert.equal(kindForClick({ x: 0.2, y: 0.4 }, "1"), "other");
});

test("actionNamesPlace: the list drops the place name when the action already says it", () => {
  assert.equal(actionNamesPlace("Harass their base", "their base"), true);
  assert.equal(actionNamesPlace("Buy at the MARKETPLACE", "Marketplace"), true);
  assert.equal(actionNamesPlace("Buy circlet", "Marketplace"), false);
});

test("the kinds: attack is numbered, five waypoint kinds, other last", () => {
  assert.deepEqual(PLACE_KINDS, ["attack", "build", "expand", "shop", "scout", "other"]);
  assert.equal(isWaypoint({ place: { kind: "other", at: { x: 0.5, y: 0.5 } } }), true);
});
