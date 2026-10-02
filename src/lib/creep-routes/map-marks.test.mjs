import test from "node:test";
import assert from "node:assert/strict";
import { LEG_GAP, OUTLINE, STOP_RADIUS, UNUSED_RADIUS, WAYPOINT_RADIUS, cornerMark, labelFit, legOffsets, nodeCentre, nodeTrim, offsetLeg } from "./map-marks.mjs";
import autumn from "./maps/autumn-leaves.json" with { type: "json" };

test("one mark per stop: a waypoint is about 80% of a stop, an unused camp about half", () => {
  assert.ok(Math.abs(WAYPOINT_RADIUS / STOP_RADIUS - 0.8) < 0.05);
  assert.equal(UNUSED_RADIUS, STOP_RADIUS / 2);
});

test("a leg ends at both node edges, not at their centres", () => {
  const ra = nodeTrim(STOP_RADIUS);
  const rb = nodeTrim(WAYPOINT_RADIUS);
  const leg = offsetLeg(0, 0, 100, 0, ra, rb);
  assert.equal(leg.x1, STOP_RADIUS + OUTLINE / 2);
  assert.equal(leg.x2, 100 - WAYPOINT_RADIUS - OUTLINE / 2);
  assert.equal(leg.y1, 0);
  // Nodes that touch draw no leg.
  assert.equal(offsetLeg(0, 0, 10, 0, ra, rb), null);
});

// Autumn Leaves path b: your start (player 1) to 1b (c08) runs through 2b (c06), and 1b back to 2b retraces it.
test("legs on one line move apart: Autumn Leaves path b no longer reads as one arrow", () => {
  const { width: iw, height: ih } = autumn.image;
  const you = autumn.starts[1];
  const camp = (id) => autumn.camps.find((c) => c.id === id);
  const c08 = nodeCentre(camp("c08").x, camp("c08").y, iw, ih);
  const c06 = nodeCentre(camp("c06").x, camp("c06").y, iw, ih);
  const start = { x: you.x * iw, y: you.y * ih, trim: 7 * 1.15 + 1 };
  const trim = nodeTrim(STOP_RADIUS);
  const legs = [
    { ax: start.x, ay: start.y, bx: c08.x, by: c08.y, ta: start.trim, tb: trim },
    { ax: c08.x, ay: c08.y, bx: c06.x, by: c06.y, ta: trim, tb: trim },
  ];
  const discs = [c08, c06].map((c) => ({ cx: c.x, cy: c.y, r: STOP_RADIUS }));
  const toLine = (s, x, y) => Math.abs((x - s.x1) * (s.y2 - s.y1) - (y - s.y1) * (s.x2 - s.x1)) / Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
  const toSegment = (s, x, y) => {
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
    const t = Math.max(0, Math.min(1, ((x - s.x1) * dx + (y - s.y1) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x - (s.x1 + t * dx), y - (s.y1 + t * dy));
  };
  const draw = (offsets) => legs.map((l, i) => offsetLeg(l.ax, l.ay, l.bx, l.by, l.ta, l.tb, offsets[i].ox, offsets[i].oy));
  // As drawn before: one line, and the first leg crosses the 2b disc.
  const [before1, before2] = draw(legs.map(() => ({ ox: 0, oy: 0 })));
  assert.ok(toLine(before1, (before2.x1 + before2.x2) / 2, (before2.y1 + before2.y2) / 2) < 3);
  assert.ok(toSegment(before1, c06.x, c06.y) < STOP_RADIUS);
  // Moved apart: the second leg 4 to one side, the first leg clear of the 2b disc on the other.
  const offsets = legOffsets(legs, discs);
  assert.ok(Math.abs(Math.hypot(offsets[1].ox, offsets[1].oy) - LEG_GAP) < 1e-9);
  const [after1, after2] = draw(offsets);
  assert.ok(toLine(after1, (after2.x1 + after2.x2) / 2, (after2.y1 + after2.y2) / 2) > 2 * LEG_GAP);
  assert.ok(toSegment(after1, c06.x, c06.y) >= STOP_RADIUS + OUTLINE / 2);
  // Both still straight and ending at the node edges.
  const at = (x, y, cx, cy) => Math.hypot(x - cx, y - cy);
  assert.ok(Math.abs(at(after1.x1, after1.y1, start.x, start.y) - start.trim) < 1e-9);
  assert.ok(Math.abs(at(after1.x2, after1.y2, c08.x, c08.y) - trim) < 1e-9);
  assert.ok(Math.abs(at(after2.x1, after2.y1, c08.x, c08.y) - trim) < 1e-9);
  assert.ok(Math.abs(at(after2.x2, after2.y2, c06.x, c06.y) - trim) < 1e-9);
});

test("legs that are not on one line keep their place", () => {
  const legs = [{ ax: 0, ay: 0, bx: 100, by: 0 }, { ax: 100, ay: 0, bx: 100, by: 100 }];
  assert.deepEqual(legOffsets(legs, [{ cx: 0, cy: 0, r: 8 }, { cx: 100, cy: 0, r: 8 }, { cx: 100, cy: 100, r: 8 }]), [{ ox: 0, oy: 0 }, { ox: 0, oy: 0 }]);
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
