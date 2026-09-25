import test from "node:test";
import assert from "node:assert/strict";
import { imageDimensions, renderWidth, ICON_MAX_WIDTH } from "./sanity-image-size.mjs";

const ref = (id) => ({ asset: { _ref: id } });

test("dimensions come out of the asset id", () => {
  assert.deepEqual(imageDimensions(ref("image-abc123-64x64-png")), { width: 64, height: 64 });
  assert.deepEqual(imageDimensions(ref("image-abc123-1920x1080-jpg")), { width: 1920, height: 1080 });
  assert.deepEqual(imageDimensions(ref("image-0a3eaca7faf3b1e73fdcbdc201458aa887a0c80c-256x256-png")), {
    width: 256,
    height: 256,
  });
});

test("an _id works as well as a _ref — both shapes appear in projections", () => {
  assert.deepEqual(imageDimensions({ asset: { _id: "image-x-100x50-webp" } }), { width: 100, height: 50 });
});

test("anything unrecognisable is null, so the caller keeps its old behaviour", () => {
  for (const v of [undefined, {}, { asset: {} }, ref("not-an-image"), ref("image-abc-png"), ref("image-abc-0x0-png")]) {
    assert.equal(imageDimensions(v), null, JSON.stringify(v));
  }
});

test("an image is never rendered wider than its source", () => {
  // The bug: a 64px icon requested at 1400px, then stretched to the column.
  assert.equal(renderWidth({ width: 64, height: 64 }), 64);
  assert.equal(renderWidth({ width: 800, height: 600 }), 800);
});

test("a large image is still capped to the column", () => {
  assert.equal(renderWidth({ width: 4000, height: 3000 }, 1400), 1400);
});

test("unknown dimensions fall back to the column width", () => {
  assert.equal(renderWidth(null, 1400), 1400);
});

test("the icon threshold separates an item icon from a screenshot", () => {
  assert.ok(64 <= ICON_MAX_WIDTH, "a 64px item icon is an icon");
  assert.ok(256 <= ICON_MAX_WIDTH, "a 256px minimap is still icon-sized here");
  assert.ok(1200 > ICON_MAX_WIDTH, "a screenshot is not");
});
