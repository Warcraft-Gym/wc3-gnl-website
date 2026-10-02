import test from "node:test";
import assert from "node:assert/strict";
import { lightboxSources, stopImageUrl, thumbSources } from "./stop-image-url.mjs";

const URL = "https://cdn.sanity.io/images/p1x2/staging/0123456789abcdef0123456789abcdef01234567-1600x1200.jpg";
const params = (u) => Object.fromEntries(new globalThis.URL(u).searchParams);

test("a Sanity picture goes through the image pipeline: width, height, fit crop, auto format", () => {
  const p = params(stopImageUrl(URL, 200, 150));
  assert.equal(p.w, "200");
  assert.equal(p.h, "150");
  assert.equal(p.fit, "crop");
  assert.equal(p.auto, "format");
  // The project and dataset stay those of the picture.
  assert.ok(stopImageUrl(URL, 200, 150).startsWith("https://cdn.sanity.io/images/p1x2/staging/"));
  // No height: the full picture that wide, not cropped.
  assert.deepEqual(params(stopImageUrl(URL, 800)), { w: "800", auto: "format" });
});

test("thumbnails: 200×150 and 160×120 at 1x and 2x, with sizes", () => {
  const t = thumbSources(URL);
  assert.equal(params(t.src).w, "200");
  assert.deepEqual(t.srcSet.split(", ").map((s) => s.split(" ")[1]), ["160w", "200w", "320w", "400w"]);
  assert.deepEqual(t.srcSet.split(", ").map((s) => params(s.split(" ")[0]).h), ["120", "150", "240", "300"]);
  assert.equal(t.sizes, "(min-width: 640px) 200px, 160px");
});

test("the lightbox picture: 800, 1200 and 1600 wide at 92vw", () => {
  const l = lightboxSources(URL);
  assert.deepEqual(l.srcSet.split(", ").map((s) => s.split(" ")[1]), ["800w", "1200w", "1600w"]);
  assert.equal(l.sizes, "92vw");
  assert.equal(params(l.src).w, "1600");
});

test("a plain URL (a fixture file) is served as is, with no srcset", () => {
  assert.equal(stopImageUrl("/creep-routes/spot.jpg", 200, 150), "/creep-routes/spot.jpg");
  assert.deepEqual(thumbSources("/creep-routes/spot.jpg"), { src: "/creep-routes/spot.jpg" });
  assert.deepEqual(lightboxSources("/creep-routes/spot.jpg"), { src: "/creep-routes/spot.jpg" });
});
