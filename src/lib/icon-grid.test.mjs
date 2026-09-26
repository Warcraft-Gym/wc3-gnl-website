import test from "node:test";
import assert from "node:assert/strict";
import { groupIconLabelPairs, MAX_LABEL_LENGTH } from "./icon-grid.mjs";

const icon = (k = "i") => ({ _type: "image", _key: k, asset: { _ref: `image-${k}-64x64-png` } });
const shot = (k = "s") => ({ _type: "image", _key: k, asset: { _ref: `image-${k}-1200x800-png` } });
const para = (text, k = "p") => ({ _type: "block", _key: k, style: "normal", children: [{ _type: "span", text }] });
const heading = (text) => ({ _type: "block", _key: "h", style: "h3", children: [{ _type: "span", text }] });

test("a run of icon+label pairs becomes one grid", () => {
  const out = groupIconLabelPairs([
    para("Level 1-", "lead"),
    icon("a"), para("Slippers of Agility +3", "la"),
    icon("b"), para("Ring of Superiority", "lb"),
    icon("c"), para("Cloak of Shadows", "lc"),
  ]);
  assert.equal(out.length, 2, "the lead paragraph, then the grid");
  assert.equal(out[0]._key, "lead");
  assert.equal(out[1]._type, "iconGrid");
  assert.deepEqual(out[1].items.map((x) => x.label), [
    "Slippers of Agility +3",
    "Ring of Superiority",
    "Cloak of Shadows",
  ]);
});

test("a heading ends a run, so sections stay separate", () => {
  const out = groupIconLabelPairs([
    icon("a"), para("One", "1"),
    icon("b"), para("Two", "2"),
    heading("Level 2"),
    icon("c"), para("Three", "3"),
    icon("d"), para("Four", "4"),
  ]);
  assert.deepEqual(out.map((b) => b._type), ["iconGrid", "block", "iconGrid"]);
  assert.equal(out[0].items.length, 2);
  assert.equal(out[2].items.length, 2);
});

test("a single pair is left alone — that is a figure, not a table", () => {
  const blocks = [icon("a"), para("Just the one", "1"), heading("After")];
  assert.deepEqual(groupIconLabelPairs(blocks).map((b) => b._type), ["image", "block", "block"]);
});

test("a screenshot with a caption is never swept up", () => {
  const blocks = [shot("a"), para("A wide screenshot caption", "1"), shot("b"), para("Another", "2")];
  assert.deepEqual(groupIconLabelPairs(blocks).map((b) => b._type), ["image", "block", "image", "block"]);
});

test("prose after an icon is not a label", () => {
  const long = "x".repeat(MAX_LABEL_LENGTH + 1);
  const blocks = [icon("a"), para(long, "1"), icon("b"), para(long, "2")];
  assert.deepEqual(groupIconLabelPairs(blocks).map((b) => b._type), ["image", "block", "image", "block"]);
});

test("an icon with no paragraph after it stays an image", () => {
  assert.deepEqual(groupIconLabelPairs([icon("a"), icon("b"), icon("c")]).map((b) => b._type), [
    "image",
    "image",
    "image",
  ]);
});

test("bullet list items are labels — that is how the migrated guide is shaped", () => {
  const li = (text, key) => ({ ...para(text, key), listItem: "bullet", level: 1 });
  const out = groupIconLabelPairs([icon("a"), li("Cloak of Shadows,", "1"), icon("b"), li("Spiked Collar.", "2")]);
  assert.deepEqual(out.map((b) => b._type), ["iconGrid"]);
  assert.deepEqual(
    out[0].items.map((x) => x.label),
    ["Cloak of Shadows", "Spiked Collar"],
    "the prose separators the list used are dropped in a grid",
  );
});

test("a heading is never a label, however short", () => {
  const out = groupIconLabelPairs([icon("a"), heading("Level 2"), icon("b"), heading("Level 3")]);
  assert.deepEqual(out.map((b) => b._type), ["image", "block", "image", "block"]);
});

test("every block survives — nothing is dropped", () => {
  const blocks = [para("intro", "i"), icon("a"), para("One", "1"), icon("b"), para("Two", "2"), para("outro", "o")];
  const out = groupIconLabelPairs(blocks);
  const kept = out.flatMap((b) => (b._type === "iconGrid" ? b.items.flatMap((x) => [x.image, x.label]) : [b]));
  assert.equal(kept.length, blocks.length, "same number of things, regrouped");
});

test("a non-array is handed back untouched", () => {
  assert.equal(groupIconLabelPairs(undefined), undefined);
  assert.equal(groupIconLabelPairs(null), null);
});

test("the conjunction closing a prose list is dropped, a real trailing word is not", () => {
  const li = (text, key) => ({ ...para(text, key), listItem: "bullet" });
  const out = groupIconLabelPairs([
    icon("a"),
    li("Ring of Protection +4, and", "1"),
    icon("b"),
    li("Rod of Necromancy and Bone", "2"),
  ]);
  assert.deepEqual(
    out[0].items.map((x) => x.label),
    ["Ring of Protection +4", "Rod of Necromancy and Bone"],
  );
});

test("a long parenthetical still labels — the guide has an 80-character one", () => {
  const long = "Wand of Lightning Shield (removed from droptable by blizzard in 1.36 patch)";
  const li = (text, key) => ({ ...para(text, key), listItem: "bullet" });
  const out = groupIconLabelPairs([icon("a"), li(long, "1"), icon("b"), li("Sentry Wards.", "2")]);
  assert.deepEqual(out.map((b) => b._type), ["iconGrid"]);
  assert.equal(out[0].items.length, 2, "a long label must not orphan the icon after it");
});

test("a paragraph of real prose is not a label", () => {
  const prose =
    "The drop table below is what actually matters in practice, because the level of the creep camp decides the item level you will see when you kill it.";
  const out = groupIconLabelPairs([icon("a"), para(prose, "1"), icon("b"), para(prose, "2")]);
  assert.deepEqual(out.map((b) => b._type), ["image", "block", "image", "block"]);
});
