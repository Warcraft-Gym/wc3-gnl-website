import test from "node:test";
import assert from "node:assert/strict";
import { isSanityImage, sanityImageLoader } from "./sanity-image-loader.mjs";

const RAW = "https://cdn.sanity.io/images/p1x2/production/0123456789abcdef0123456789abcdef01234567-1600x1200.jpg";
const params = (u) => Object.fromEntries(new URL(u).searchParams);

test("only a picture on Sanity's CDN takes the loader", () => {
  assert.equal(isSanityImage(RAW), true);
  assert.equal(isSanityImage("/factions/large/orc.webp"), false);
  assert.equal(isSanityImage("https://example.com/a.png"), false);
  assert.equal(isSanityImage({ src: "/a.png", width: 1, height: 1 }), false);
});

test("a plain asset URL is resized by Sanity, never upscaled, in the best format", () => {
  const u = sanityImageLoader({ src: RAW, width: 640 });
  assert.ok(u.startsWith(RAW.split("?")[0]));
  assert.deepEqual(params(u), { w: "640", fit: "max", auto: "format", q: "75" });
  assert.equal(params(sanityImageLoader({ src: RAW, width: 640, quality: 60 })).q, "60");
});

test("a cropped URL keeps its crop and aspect at a smaller width", () => {
  const src = `${RAW}?w=700&h=394&fit=crop&auto=format`;
  const p = params(sanityImageLoader({ src, width: 384 }));
  assert.equal(p.w, "384");
  assert.equal(p.h, "216");
  assert.equal(p.fit, "crop");
  assert.equal(p.auto, "format");
});

test("a width past the caller's own is capped at it", () => {
  const src = `${RAW}?w=700&h=394&fit=crop&auto=format`;
  const p = params(sanityImageLoader({ src, width: 1920 }));
  assert.equal(p.w, "700");
  assert.equal(p.h, "394");
});
