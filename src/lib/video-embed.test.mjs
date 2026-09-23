import test from "node:test";
import assert from "node:assert/strict";
import { embedUrl, isEmbeddable } from "./video-embed.mjs";

const ID = "dQw4w9WgXcQ";
const EMBED = `https://www.youtube-nocookie.com/embed/${ID}`;

test("every YouTube URL shape a person might paste", () => {
  for (const url of [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube.com/live/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
  ]) {
    assert.equal(embedUrl(url), EMBED, url);
  }
});

test("extra query parameters do not leak into the embed", () => {
  // A link copied from a playlist or with a timestamp is the common case; the
  // id is a fixed 11 characters, so match that rather than "up to the &".
  assert.equal(embedUrl(`https://www.youtube.com/watch?v=${ID}&list=PL123&index=2`), EMBED);
  assert.equal(embedUrl(`https://youtu.be/${ID}?t=142`), EMBED);
  assert.equal(embedUrl(`https://www.youtube.com/watch?app=desktop&v=${ID}`), EMBED);
});

test("YouTube is embedded through the no-cookie host", () => {
  // Not cosmetic: the visitor is not handed to YouTube's cookies until they
  // choose to play.
  assert.ok(embedUrl(`https://youtu.be/${ID}`).startsWith("https://www.youtube-nocookie.com/"));
});

test("Vimeo works too", () => {
  assert.equal(embedUrl("https://vimeo.com/123456789"), "https://player.vimeo.com/video/123456789");
  assert.equal(embedUrl("https://vimeo.com/video/123456789"), "https://player.vimeo.com/video/123456789");
});

test("anything else is null, so the caller can fall back to a link", () => {
  for (const url of [
    undefined,
    "",
    "not a url",
    "https://example.com/video.mp4",
    "https://twitch.tv/someone",
    "https://www.youtube.com/watch?v=tooshort",
    "https://www.youtube.com/",
  ]) {
    assert.equal(embedUrl(url), null, String(url));
  }
});

test("isEmbeddable mirrors embedUrl", () => {
  assert.equal(isEmbeddable(`https://youtu.be/${ID}`), true);
  assert.equal(isEmbeddable("https://twitch.tv/someone"), false);
});
