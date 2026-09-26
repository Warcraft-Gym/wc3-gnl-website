/**
 * The migration's safety net. These URLs are indexed under warcraft-gym.com
 * today; a redirect that points at a page which does not exist loses the
 * ranking just as surely as no redirect at all, and nothing else in the build
 * would notice.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));

/** Parsed from the source rather than imported: this is a `.ts` module and
 *  `node --test` has no loader. The shape is generated and uniform. */
function redirects() {
  const src = readFileSync(join(DIR, "legacy-redirects.ts"), "utf8");
  return [...src.matchAll(/\{ source: "([^"]+)", destination: "([^"]+)", permanent: true \}/g)].map(
    (m) => ({ source: m[1], destination: m[2] }),
  );
}

test("the table covers the WordPress site's indexed URLs", () => {
  assert.ok(redirects().length >= 170, `only ${redirects().length} redirects`);
});

test("no source redirects to itself, and none is listed twice", () => {
  const seen = new Set();
  for (const r of redirects()) {
    assert.notEqual(r.source, r.destination, `${r.source} redirects to itself`);
    assert.ok(!seen.has(r.source), `${r.source} is listed twice — the second is dead`);
    seen.add(r.source);
  }
});

test("sources carry no trailing slash, so Next's normalisation matches them", () => {
  for (const r of redirects()) {
    assert.ok(!r.source.endsWith("/"), `${r.source} ends with a slash`);
    assert.ok(r.source.startsWith("/"), `${r.source} is not rooted`);
  }
});

test("no redirect points at another redirect's source — chains lose authority", () => {
  const sources = new Set(redirects().map((r) => r.source));
  for (const r of redirects()) {
    assert.ok(!sources.has(r.destination), `${r.source} -> ${r.destination}, which itself redirects`);
  }
});

test("every destination is a route this site actually serves", () => {
  // Route groups like `(site)` are not URL segments, and a dynamic segment
  // stands in for any slug, so compare shapes rather than exact paths.
  const known = [
    /^\/$/,
    /^\/(about|blog|privacy|tools)$/,
    /^\/king-of-the-hill$/,
    /^\/blog\/[a-z0-9-]+$/,
    /^\/learn$/,
    /^\/learn\/(human|orc|undead|night-elf|mechanics|new-players|builds|creep-routes|guides)$/,
    /^\/learn\/(guide|builds|creep-routes)\/[a-z0-9-]+$/,
    // No bare `/gnl`: the new site has no league index, so a redirect there
    // would land on a 404 and lose the page instead of moving it. The old
    // `/gnl/` hub maps to `/gnl/about`.
    /^\/gnl\/(about|rules|schedule|standings|teams|fantasy)$/,
  ];
  for (const r of redirects()) {
    assert.ok(
      known.some((re) => re.test(r.destination)),
      `${r.source} -> ${r.destination}, which does not look like a route on this site`,
    );
  }
});
