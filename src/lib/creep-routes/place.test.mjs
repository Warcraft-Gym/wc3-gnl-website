import { test } from "node:test";
import assert from "node:assert/strict";
import { placeIds, placeName, placePoint, placeProblem } from "./place.mjs";

const map = {
  starts: [{ player: 1, x: 0.7, y: 0.9 }, { player: 3, x: 0.3, y: 0.1 }],
  mines: [{ x: 0.5, y: 0.5, gold: 12500 }],
  shops: [{ id: "nmrk-6", x: 0.73, y: 0.27 }, { id: "hrdh-1", x: 0.2, y: 0.2 }],
};

test("placePoint resolves a start by player, a mine by index, a shop by id, a point as given", () => {
  assert.deepEqual(placePoint(map, { kind: "start", id: "3" }), map.starts[1]);
  assert.deepEqual(placePoint(map, { kind: "mine", id: "0" }), map.mines[0]);
  assert.deepEqual(placePoint(map, { kind: "shop", id: "nmrk-6" }), map.shops[0]);
  assert.deepEqual(placePoint(map, { kind: "point", x: 0.25, y: 0.75 }), { x: 0.25, y: 0.75 });
  assert.equal(placePoint(map, { kind: "start", id: "9" }), null);
});

test("placeName: your base, their base, a gold mine, the shop's name or shop, on the map", () => {
  assert.equal(placeName(map, { kind: "start", id: "1" }, 0), "your base");
  assert.equal(placeName(map, { kind: "start", id: "3" }, 0), "their base");
  assert.equal(placeName(map, { kind: "mine", id: "0" }), "a gold mine");
  assert.equal(placeName(map, { kind: "shop", id: "nmrk-6" }), "Marketplace");
  assert.equal(placeName(map, { kind: "shop", id: "hrdh-1" }), "shop");
  assert.equal(placeName(map, { kind: "point", x: 0.1, y: 0.1 }), "on the map");
});

test("placeProblem names an id the map does not have and passes a point", () => {
  const ids = placeIds(map);
  assert.equal(placeProblem({ kind: "start", id: "3" }, ids), null);
  assert.match(placeProblem({ kind: "start", id: "2" }, ids), /Unknown start/);
  assert.match(placeProblem({ kind: "mine", id: "1" }, ids), /Unknown gold mine/);
  assert.match(placeProblem({ kind: "shop", id: "ngme-0" }, ids), /Unknown shop/);
  assert.equal(placeProblem({ kind: "point", x: 0.5, y: 0.5 }, ids), null);
  assert.equal(placeProblem({ kind: "shop", id: "anything" }, {}), null);
});
