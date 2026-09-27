import { test } from "node:test";
import assert from "node:assert/strict";
import { BRACKET_ART, bracketArt, bracketFloor } from "./bracket-art.mjs";

test("the crown on the plinth is the top bracket's", () => {
  assert.match(BRACKET_ART.TOP, /koth-crown-hill-1/);
  assert.equal(bracketArt("1600 to 1750 MMR"), BRACKET_ART.TOP);
});

test("today's three brackets get three different emblems", () => {
  const got = ["1600 to 1750 MMR", "1450 to 1600 MMR", "1450 and below"].map(bracketArt);
  assert.deepEqual(got, [BRACKET_ART.TOP, BRACKET_ART.MIDDLE, BRACKET_ART.BOTTOM]);
  assert.equal(new Set(got).size, 3, "all three must differ");
});

test("the archive's older spellings land on the same three", () => {
  assert.equal(bracketArt("1600+"), BRACKET_ART.TOP);
  assert.equal(bracketArt("1450-1600"), BRACKET_ART.MIDDLE);
  assert.equal(bracketArt("1450 and below"), BRACKET_ART.BOTTOM);
});

test("'and below' wins over the number in it", () => {
  // "1500 and Below" names 1500 but is still the floor bracket.
  assert.equal(bracketArt("1500 and Below"), BRACKET_ART.BOTTOM);
  assert.equal(bracketArt("Gold and below"), BRACKET_ART.BOTTOM, "no number at all");
  assert.equal(bracketArt("1750 and below"), BRACKET_ART.BOTTOM, "even above the top floor");
});

test("the lowest number in a range is the entry requirement", () => {
  assert.equal(bracketFloor("1450 to 1600 MMR"), 1450);
  assert.equal(bracketFloor("1600 to 1750 MMR"), 1600);
  assert.equal(bracketFloor("2000+ mmr"), 2000);
  assert.equal(bracketFloor("Platinum to 1700 MMR"), 1700);
  assert.equal(bracketFloor("no numbers here"), null);
});

test("2021's Platinum and Gold tiers still resolve", () => {
  assert.equal(bracketArt("Platinum to 1700 MMR"), BRACKET_ART.TOP);
  assert.equal(bracketArt("Gold and below"), BRACKET_ART.BOTTOM);
  assert.equal(bracketArt("1500 to 1700 MMR"), BRACKET_ART.MIDDLE);
});

test("an unrecognised bracket gets the middle emblem, never nothing", () => {
  for (const b of ["", "mystery", null, undefined, 42]) {
    assert.equal(bracketArt(b), BRACKET_ART.MIDDLE, JSON.stringify(b));
  }
});
