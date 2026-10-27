import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { servedAsIs } from "./served-as-is.mjs";

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), "../../public");

test("race icons and crests load as files", () => {
  for (const src of ["/factions/orc.png", "/factions/random.png", "/factions/large/nightelf.webp"]) {
    assert.ok(existsSync(join(PUBLIC, src)), `${src} is not in public/`);
    assert.equal(servedAsIs(src), true, src);
  }
});

test("banners, key art and remote pictures stay optimised", () => {
  for (const src of [
    "/factions/headers/orc.webp",
    "/keyart/section-sparks.webp",
    "/logo/w3gym-gold.webp",
    "https://cdn.sanity.io/images/x/y/a.png",
    { src: "/factions/orc.png" },
  ]) {
    assert.equal(servedAsIs(src), false, String(src));
  }
});
