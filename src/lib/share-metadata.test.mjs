import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SHARE_IMAGE, SITE_NAME, TWITTER_HANDLE, pageMetadata, shareTitle } from "./share-metadata.mjs";

const base = { title: "Crit Happens, GNL 18 team", description: "Roster and fixtures.", path: "/gnl/teams/crit-happens" };

test("the share title matches the document title the layout template produces", () => {
  assert.equal(shareTitle("Crit Happens, GNL 18 team"), `Crit Happens, GNL 18 team · ${SITE_NAME}`);
});

test("sets the page's own title, description and url on openGraph and twitter", () => {
  const meta = pageMetadata(base);
  assert.equal(meta.title, base.title);
  assert.equal(meta.description, base.description);
  assert.deepEqual(meta.alternates, { canonical: base.path });
  assert.equal(meta.openGraph.title, shareTitle(base.title));
  assert.equal(meta.openGraph.description, base.description);
  assert.equal(meta.openGraph.url, base.path);
  assert.equal(meta.twitter.title, shareTitle(base.title));
  assert.equal(meta.twitter.description, base.description);
});

test("keeps the site defaults the per-key merge would otherwise drop", () => {
  const meta = pageMetadata(base);
  assert.equal(meta.openGraph.type, "website");
  assert.equal(meta.openGraph.siteName, SITE_NAME);
  assert.equal(meta.openGraph.locale, "en_US");
  assert.equal(meta.twitter.card, "summary_large_image");
  assert.equal(meta.twitter.site, TWITTER_HANDLE);
});

test("never sets twitter images, so X falls back to the og:image", () => {
  for (const meta of [pageMetadata(base), pageMetadata({ ...base, ownCard: true }), pageMetadata({ ...base, images: [{ url: "/x.webp" }] })]) {
    assert.ok(!Object.hasOwn(meta.twitter, "images"));
  }
});

test("a route with its own opengraph-image leaves the images key out entirely", () => {
  // Next only fills og:image from the file convention when the page's
  // openGraph has no `images` property at all; even `images: undefined` blocks it.
  const meta = pageMetadata({ ...base, ownCard: true });
  assert.ok(!Object.hasOwn(meta.openGraph, "images"));
});

test("a route without its own card gets the site card, since declaring openGraph drops the inherited one", () => {
  const meta = pageMetadata(base);
  assert.deepEqual(meta.openGraph.images, [DEFAULT_SHARE_IMAGE]);
});

test("explicit images win over the site card", () => {
  const images = [{ url: "https://cdn.sanity.io/cover.jpg" }];
  assert.deepEqual(pageMetadata({ ...base, images }).openGraph.images, images);
});

test("an empty or missing image list falls back to the site card", () => {
  assert.deepEqual(pageMetadata({ ...base, images: [] }).openGraph.images, [DEFAULT_SHARE_IMAGE]);
  assert.deepEqual(pageMetadata({ ...base, images: undefined }).openGraph.images, [DEFAULT_SHARE_IMAGE]);
});

test("a shorter share description replaces only the preview text", () => {
  const meta = pageMetadata({ ...base, shareDescription: "Short." });
  assert.equal(meta.description, base.description);
  assert.equal(meta.openGraph.description, "Short.");
  assert.equal(meta.twitter.description, "Short.");
});

test("article fields switch the type and carry through", () => {
  const meta = pageMetadata({
    ...base,
    article: { publishedTime: "2026-01-01", modifiedTime: "2026-02-01", authors: ["Stefano"], section: "Orc" },
  });
  assert.equal(meta.openGraph.type, "article");
  assert.equal(meta.openGraph.publishedTime, "2026-01-01");
  assert.equal(meta.openGraph.modifiedTime, "2026-02-01");
  assert.deepEqual(meta.openGraph.authors, ["Stefano"]);
  assert.equal(meta.openGraph.section, "Orc");
});

test("extra fields such as robots pass through", () => {
  assert.deepEqual(pageMetadata({ ...base, robots: { index: false } }).robots, { index: false });
});

test("returns fresh objects, so one page cannot mutate another's metadata", () => {
  const a = pageMetadata(base);
  const b = pageMetadata(base);
  assert.notEqual(a.openGraph, b.openGraph);
  assert.notEqual(a.openGraph.images, b.openGraph.images);
  a.openGraph.images[0].url = "/changed";
  assert.equal(DEFAULT_SHARE_IMAGE.url, "/opengraph-image.jpg");
});

test("rejects input that would ship a broken preview", () => {
  assert.throws(() => pageMetadata({ ...base, title: "" }), /title/);
  assert.throws(() => pageMetadata({ ...base, path: "gnl/teams" }), /path/);
  assert.throws(() => pageMetadata({ ...base, path: "https://warcraft-gym.com/x" }), /path/);
  assert.throws(() => pageMetadata({ ...base, ownCard: true, images: [{ url: "/x.webp" }] }), /ownCard/);
});
