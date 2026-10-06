import { test } from "node:test";
import assert from "node:assert/strict";
import { layoutTargets, nearTarget, TARGET_R, TARGET_GAP } from "./place-targets.mjs";

test("targets apart stay on their spots", () => {
  const out = layoutTargets([{ x: 50, y: 50 }, { x: 150, y: 50 }], 300, 300);
  assert.deepEqual(out, [{ x: 50, y: 50, moved: false }, { x: 150, y: 50, moved: false }]);
});

test("overlapping targets are pushed apart until each disc shows", () => {
  const pts = [{ x: 100, y: 100 }, { x: 110, y: 100 }, { x: 100, y: 110 }, { x: 100, y: 100 }];
  const out = layoutTargets(pts, 400, 400);
  for (let a = 0; a < out.length; a++)
    for (let b = a + 1; b < out.length; b++) assert.ok(Math.hypot(out[a].x - out[b].x, out[a].y - out[b].y) >= 2 * TARGET_R + TARGET_GAP - 0.5);
  assert.ok(out.some((o) => o.moved));
});

test("a target is kept inside the map", () => {
  const [o] = layoutTargets([{ x: 1, y: 299 }], 300, 300);
  assert.deepEqual([o.x, o.y], [TARGET_R + 2, 300 - TARGET_R - 2]);
});

test("a click within 6 px outside a disc takes that target; further out takes none", () => {
  const t = [{ x: 100, y: 100 }, { x: 200, y: 100 }];
  assert.equal(nearTarget(100, 100, t), 0);
  assert.equal(nearTarget(100 + TARGET_R + 6, 100, t), 0);
  assert.equal(nearTarget(100 + TARGET_R + 7, 100, t), -1);
  assert.equal(nearTarget(200, 100 - TARGET_R - 3, t), 1);
});
