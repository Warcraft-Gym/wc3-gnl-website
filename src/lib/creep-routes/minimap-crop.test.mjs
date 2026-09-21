import assert from "node:assert/strict";
import test from "node:test";
import { cropLetterbox } from "./minimap-crop.mjs";

/** A `width`x`height` RGBA buffer, black (0,0,0,255) for the first/last
 * `bandRows` rows (top/bottom) and mid-grey (128,128,128,255) elsewhere. */
function makeBuffer(width, height, bandRows = 0) {
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const inBand = y < bandRows || y >= height - bandRows;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const value = inBand ? 0 : 128;
      rgba[i] = value;
      rgba[i + 1] = value;
      rgba[i + 2] = value;
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}

test("crops 32 black rows top and bottom to match a 4/3 bounds aspect", () => {
  const buffer = makeBuffer(256, 256, 32);
  const result = cropLetterbox(buffer, 256, 256, 4 / 3);
  assert.equal(result.width, 256);
  assert.equal(result.height, 192);
  assert.equal(result.data.length, 256 * 192 * 4);
  // The cropped image should be all mid-grey (no band pixels survived).
  for (let i = 0; i < result.data.length; i += 4) {
    assert.equal(result.data[i], 128);
  }
});

test("a buffer with no bands and a square bounds aspect is left unchanged", () => {
  const buffer = makeBuffer(256, 256, 0);
  const result = cropLetterbox(buffer, 256, 256, 1);
  assert.equal(result.width, 256);
  assert.equal(result.height, 256);
  assert.deepEqual(result.data, buffer);
});

test("a buffer with no bands but a non-square bounds aspect throws, naming both aspects", () => {
  const buffer = makeBuffer(256, 256, 0);
  assert.throws(() => cropLetterbox(buffer, 256, 256, 4 / 3), (error) => {
    assert.match(error.message, /1(\.0*)?/); // image aspect ~1
    assert.match(error.message, /1\.3333/); // bounds aspect 4/3
    return true;
  });
});

// F001-followup-3: over the *playable* rect (terrain minus the w3i
// "complements" border), several bundle maps' bounds aspect no longer
// matches the letterbox band split within the plain 3% tolerance — the
// editor itself rounds the letterboxed content height up to a multiple of
// 16 (and stretches slightly to fill it), so the crop accepts that rounded
// height too. See the feature's evidence/bounds.mjs output.

test("Echo Isles-like: aspect 1.381 crops to 256x192 (ceil16(256/1.381)=192, outside the plain 3% tolerance)", () => {
  const buffer = makeBuffer(256, 256, 32); // 256 - 32*2 = 192 rows of content
  const result = cropLetterbox(buffer, 256, 256, 1.381);
  assert.equal(result.width, 256);
  assert.equal(result.height, 192);
});

test("Northern Isles-like: aspect 1.2558 crops to 256x208 (ceil16(256/1.2558)=208)", () => {
  const buffer = makeBuffer(256, 256, 24); // 256 - 24*2 = 208 rows of content
  const result = cropLetterbox(buffer, 256, 256, 1.2558);
  assert.equal(result.width, 256);
  assert.equal(result.height, 208);
});

test("a genuinely mismatched crop (not a 16-px rounding away) still throws", () => {
  const buffer = makeBuffer(256, 256, 48); // 256 - 48*2 = 160 rows; ceil16(256/1.381)=192, off by 32
  assert.throws(() => cropLetterbox(buffer, 256, 256, 1.381), (error) => {
    assert.match(error.message, /1\.381/);
    return true;
  });
});
