import test from "node:test";
import assert from "node:assert/strict";
import { badgePosition, BADGE_MARGIN, BADGE_OFFSET } from "./badge-position.mjs";

const IW = 256;
const IH = 256;

test("a camp with room above keeps the badge above it", () => {
  const camp = { x: 0.5, y: 0.5 };
  const b = badgePosition(camp.x, camp.y, IW, IH);
  assert.equal(b.flipped, false);
  assert.equal(b.y, camp.y * IH - BADGE_OFFSET);
  assert.equal(b.x, camp.x * IW);
});

test("a camp near the top flips the badge below instead of clipping", () => {
  // Echo Isles' top camp sits about 10px from the edge; above would be -3.
  const y = 10 / IH;
  const b = badgePosition(0.5, y, IW, IH);
  assert.equal(b.flipped, true);
  assert.equal(b.y, 10 + BADGE_OFFSET);
  assert.ok(b.y >= BADGE_MARGIN);
});

test("a camp hard against the top edge still lands fully inside", () => {
  const b = badgePosition(0.5, 0, IW, IH);
  assert.ok(b.y >= BADGE_MARGIN, `badge at ${b.y} would clip`);
  assert.ok(b.y <= IH - BADGE_MARGIN);
});

test("a camp near the bottom does not flip into the edge", () => {
  const b = badgePosition(0.5, 1, IW, IH);
  assert.equal(b.flipped, false, "no room below, so it must stay above");
  assert.ok(b.y <= IH - BADGE_MARGIN);
  assert.ok(b.y >= BADGE_MARGIN);
});

test("badges at the left and right edges are pulled inside horizontally", () => {
  assert.ok(badgePosition(0, 0.5, IW, IH).x >= BADGE_MARGIN);
  assert.ok(badgePosition(1, 0.5, IW, IH).x <= IW - BADGE_MARGIN);
});

test("every corner stays fully within the viewBox", () => {
  for (const x of [0, 1]) {
    for (const y of [0, 1]) {
      const b = badgePosition(x, y, IW, IH);
      assert.ok(b.x >= BADGE_MARGIN && b.x <= IW - BADGE_MARGIN, `corner ${x},${y} x=${b.x}`);
      assert.ok(b.y >= BADGE_MARGIN && b.y <= IH - BADGE_MARGIN, `corner ${x},${y} y=${b.y}`);
    }
  }
});

test("a letterboxed map (256x192) is handled in its own units", () => {
  const b = badgePosition(0.5, 0, 256, 192);
  assert.ok(b.y >= BADGE_MARGIN);
  assert.ok(b.y <= 192 - BADGE_MARGIN);
});
