import assert from "node:assert/strict";
import test from "node:test";
import { decodePng, resizeRGBA, fitDimensions, downscaleIconPng } from "../../../scripts/creep-maps/icons.mjs";
import { encodePng } from "../../../scripts/creep-maps/minimap.mjs";
import { writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

test("decodePng round-trips encodePng's own RGBA output", () => {
  const width = 3;
  const height = 2;
  const rgba = new Uint8Array([
    255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 0,
    10, 20, 30, 255, 255, 255, 255, 255, 0, 0, 0, 0,
  ]);
  const png = encodePng(width, height, rgba);
  const decoded = decodePng(png);
  assert.equal(decoded.width, width);
  assert.equal(decoded.height, height);
  assert.deepEqual([...decoded.data], [...rgba]);
});

test("fitDimensions keeps aspect and matches the gold mine's 256x211 -> 64x53", () => {
  assert.deepEqual(fitDimensions(256, 211, 64), { w: 64, h: 53 });
  assert.deepEqual(fitDimensions(128, 128, 64), { w: 64, h: 64 });
  // Longer side becomes 64 regardless of which axis it's on.
  assert.deepEqual(fitDimensions(190, 211, 64), { w: 58, h: 64 });
});

test("resizeRGBA alpha-premultiplies: a fully-transparent pixel's own RGB never bleeds into the average", () => {
  // 2x1: opaque red next to a fully-transparent pixel whose own colour is
  // (arbitrarily) black. A naive unweighted average would turn this a
  // muddy dark red; premultiplied averaging should keep it pure red at
  // half the alpha (only one of the two source pixels is opaque).
  const src = new Uint8Array([255, 0, 0, 255, 0, 0, 0, 0]);
  const out = resizeRGBA(src, 2, 1, 1, 1);
  assert.equal(out[0], 255); // R
  assert.equal(out[1], 0); // G
  assert.equal(out[2], 0); // B
  assert.equal(out[3], 128); // A: average of 255 and 0
});

test("resizeRGBA leaves a fully-opaque uniform image unchanged in colour when downscaled", () => {
  const src = new Uint8Array(4 * 4 * 4).fill(0);
  for (let i = 0; i < src.length; i += 4) {
    src[i] = 100;
    src[i + 1] = 150;
    src[i + 2] = 200;
    src[i + 3] = 255;
  }
  const out = resizeRGBA(src, 4, 4, 2, 2);
  for (let i = 0; i < out.length; i += 4) {
    assert.equal(out[i], 100);
    assert.equal(out[i + 1], 150);
    assert.equal(out[i + 2], 200);
    assert.equal(out[i + 3], 255);
  }
});

test("downscaleIconPng writes a PNG that fits within 64x64 and decodes back losslessly at the new size", () => {
  const width = 128;
  const height = 128;
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = 12;
    rgba[i + 1] = 34;
    rgba[i + 2] = 56;
    rgba[i + 3] = 255;
  }
  const dir = mkdtempSync(join(tmpdir(), "icons-test-"));
  const sourcePath = join(dir, "source.png");
  writeFileSync(sourcePath, encodePng(width, height, rgba));

  const { png, width: w, height: h } = downscaleIconPng(sourcePath, 64);
  assert.equal(w, 64);
  assert.equal(h, 64);
  const decoded = decodePng(png);
  assert.equal(decoded.width, 64);
  assert.equal(decoded.height, 64);
  // A uniform-colour source downscales to the same uniform colour.
  assert.equal(decoded.data[0], 12);
  assert.equal(decoded.data[1], 34);
  assert.equal(decoded.data[2], 56);
  assert.equal(decoded.data[3], 255);
});
