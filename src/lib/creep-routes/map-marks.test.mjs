import test from "node:test";
import assert from "node:assert/strict";
import { OUTLINE, STOP_RADIUS, UNUSED_RADIUS, WAYPOINT_RADIUS, cornerMark, labelFit, nodeCentre, nodeTrim, trimLeg } from "./map-marks.mjs";

test("one mark per stop: a waypoint is about 80% of a stop, an unused camp about half", () => {
  assert.ok(Math.abs(WAYPOINT_RADIUS / STOP_RADIUS - 0.8) < 0.05);
  assert.equal(UNUSED_RADIUS, STOP_RADIUS / 2);
});

test("a leg ends at both node edges, not at their centres", () => {
  const ra = nodeTrim(STOP_RADIUS);
  const rb = nodeTrim(WAYPOINT_RADIUS);
  const leg = trimLeg(0, 0, 100, 0, ra, rb);
  assert.equal(leg.x1, STOP_RADIUS + OUTLINE / 2);
  assert.equal(leg.x2, 100 - WAYPOINT_RADIUS - OUTLINE / 2);
  assert.equal(leg.y1, 0);
  // Nodes that touch draw no leg.
  assert.equal(trimLeg(0, 0, 10, 0, ra, rb), null);
});

test("the attack swords and the hero-off unit sit at the disc's top-right", () => {
  const { x, y } = cornerMark(50, 50);
  assert.ok(x > 50 && y < 50);
  assert.ok(Math.abs(Math.hypot(x - 50, y - 50) - STOP_RADIUS) < 1e-9);
});

test("a long label is squeezed inside the disc; short ones keep their width", () => {
  assert.equal(labelFit("4a"), undefined);
  assert.equal(labelFit("12"), undefined);
  assert.ok(labelFit("12a") < 2 * STOP_RADIUS);
});

test("a camp at the map's edge keeps its whole disc inside the map", () => {
  // Echo Isles' top camp sits about 10px from the edge.
  const top = nodeCentre(0.5, 10 / 192, 256, 192);
  assert.equal(top.y, 10);
  const edge = nodeCentre(0, 0, 256, 192);
  assert.equal(edge.x, STOP_RADIUS + OUTLINE);
  assert.equal(edge.y, STOP_RADIUS + OUTLINE);
  assert.equal(nodeCentre(1, 1, 256, 192).y, 192 - STOP_RADIUS - OUTLINE);
});
