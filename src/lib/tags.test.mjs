import assert from "node:assert/strict";
import test from "node:test";
import { playedAsNote, slugMatch, tagSlug } from "./tags.mjs";

test("an old name link matches the name part of a tag the person holds or played as", () => {
  assert.equal(tagSlug("BeLit#11855"), "belit");
  const fatts = { name: "FattsRussell", battleTag: "BeLit#11855", played_as: "MangoIsNice#1230" };
  assert.equal(slugMatch(fatts, "fattsrussell"), "name");
  assert.equal(slugMatch(fatts, "belit"), "tag");
  assert.equal(slugMatch(fatts, "mangoisnice"), "tag");
  assert.equal(slugMatch(fatts, "belit11855"), null);
  assert.equal(slugMatch({ name: "BvSG", battleTag: null }, "belit"), null);
});

test("a season names its tag only when it differs from the current tag", () => {
  assert.equal(playedAsNote("MangoIsNice#1230", "BeLit#11855"), "MangoIsNice#1230");
  assert.equal(playedAsNote("belit#11855", "BeLit#11855"), null);
  assert.equal(playedAsNote(null, "BeLit#11855"), null);
  assert.equal(playedAsNote("  ", "BeLit#11855"), null);
  assert.equal(playedAsNote("BeLit#11855", null), "BeLit#11855");
});
