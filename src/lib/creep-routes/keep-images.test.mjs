import { test } from "node:test";
import assert from "node:assert/strict";
import { keepImages } from "./keep-images.mjs";

const pic = (ref) => ({ _type: "image", _key: `k-${ref}`, asset: { _type: "reference", _ref: ref }, alt: ref });
// The replaced route as Sanity stores it: c1 and the split's path stop c3 have pictures.
const old = [
  { _type: "stop", _key: "s1", campId: "c1", images: [pic("image-a"), pic("image-b")] },
  { _type: "stop", _key: "s2", campId: "c2" },
  {
    _type: "creepSplit",
    _key: "n1",
    mode: "or",
    arms: [
      { _key: "a1", stops: [{ _type: "stop", _key: "s3", campId: "c3", images: [pic("image-c")] }] },
      { _key: "a2", stops: [{ _type: "stop", _key: "s4", campId: "c4" }] },
    ],
  },
];

test("a stop that names an old stop's key gets its pictures; a new stop gets none", () => {
  const out = keepImages([{ key: "s1", campId: "c1" }, { campId: "c9" }], old);
  assert.deepEqual(out[0].images.map((i) => i.asset._ref), ["image-a", "image-b"]);
  assert.equal(out[1].images, undefined);
});

test("only pictures with a file are copied, and at most the cap of 3", () => {
  const five = [pic("image-a"), { _type: "image", _key: "k-none", alt: "no file" }, pic("image-c"), pic("image-d"), pic("image-e")];
  const out = keepImages([{ key: "s1", campId: "c1" }], [{ _type: "stop", _key: "s1", campId: "c1", images: five }]);
  assert.deepEqual(out[0].images.map((i) => i.asset._ref), ["image-a", "image-c", "image-d"]);
});

test("an unknown key, or a key whose stop has no pictures, gets none", () => {
  const out = keepImages([{ key: "zzz", campId: "c1" }, { key: "s2", campId: "c2" }, { key: "n1", campId: "c5" }], old);
  assert.deepEqual(out.map((s) => s.images), [undefined, undefined, undefined]);
});

test("a stop inside a path keeps its pictures, and a stop may move between the main list and a path", () => {
  const out = keepImages(
    [{ key: "s3", campId: "c3" }, { campId: null, split: { mode: "and", arms: [{ stops: [{ key: "s1", campId: "c1" }] }, { stops: [] }] } }],
    old,
  );
  assert.equal(out[0].images[0].asset._ref, "image-c");
  assert.equal(out[1].split.arms[0].stops[0].images.length, 2);
  assert.equal(out[1].split.mode, "and");
});

test("a removed stop takes its pictures with it, and a key named twice gives them once", () => {
  const out = keepImages([{ key: "s3", campId: "c3" }, { key: "s3", campId: "c3" }], old);
  assert.equal(out[0].images.length, 1);
  assert.equal(out[1].images, undefined);
  assert.ok(!JSON.stringify(out).includes("image-a"));
});

test("no replaced route: the stops come back unchanged", () => {
  const stops = [{ key: "s1", campId: "c1" }];
  assert.deepEqual(keepImages(stops, null), stops);
});
