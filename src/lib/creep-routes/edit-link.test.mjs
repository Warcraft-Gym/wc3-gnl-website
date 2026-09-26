/**
 * The "Suggest an update" loop: a published route becomes a URL, the submit
 * form decodes it back, and the result names the route being replaced.
 *
 * Worth testing end to end rather than in halves — the encoder lives with the
 * route page and the decoder with the form, and the only thing binding them
 * is that they agree on the payload.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { routeEditHref, toExchangeRoute, descriptionToText } from "./edit-link.mjs";
import { decodeFromHash, IMPORT_HASH_KEY } from "./exchange-codec.mjs";
import { FIXTURE_ROUTES } from "./fixtures.mjs";

/** What `RouteSubmitForm` does with the hash it is handed. */
function decodeHref(href) {
  const hash = href.slice(href.indexOf("#") + 1);
  const [key, value] = hash.split("=");
  assert.equal(key, IMPORT_HASH_KEY);
  const json = decodeFromHash(value);
  assert.ok(json, "payload did not decode");
  return JSON.parse(json);
}

test("a route survives the round trip to the submit form", () => {
  const route = FIXTURE_ROUTES[0];
  const decoded = decodeHref(routeEditHref(route));

  assert.equal(decoded.format, "wc3gym-creep-route");
  const r = decoded.route;
  assert.equal(r.title, route.title);
  assert.equal(r.map, route.map.slug);
  assert.equal(r.race, route.race);
  assert.equal(r.author, route.author);
  assert.equal(r.summary, route.summary);
  assert.equal(r.stops.length, route.stops.length);
  assert.deepEqual(
    r.stops.map((s) => s.campId),
    route.stops.map((s) => s.campId ?? null),
  );
});

test("the payload names the route it replaces — that is what makes it an edit", () => {
  const route = FIXTURE_ROUTES[0];
  assert.equal(decodeHref(routeEditHref(route)).route.supersedes, route.slug);
});

test("stop detail — units, notes, conditions — is carried, not dropped", () => {
  const route = FIXTURE_ROUTES.find((r) => r.stops.some((s) => s.units?.length));
  assert.ok(route, "no fixture route has units on a stop");
  const withUnits = decodeHref(routeEditHref(route)).route.stops.find((s) => s.units?.length);
  const original = route.stops.find((s) => s.units?.length);
  assert.deepEqual(withUnits.units, original.units.map((u) => ({ icon: u.icon, count: u.count })));
  assert.equal(withUnits.note, original.note);
});

test("every fixture route produces a usable link", () => {
  for (const route of FIXTURE_ROUTES) {
    const href = routeEditHref(route);
    assert.ok(href, `${route.slug} produced no link`);
    assert.ok(href.startsWith("/learn/creep-routes/submit#"), href);
    assert.equal(decodeHref(href).route.supersedes, route.slug);
  }
});

test("a route with no stops gets no link rather than a broken one", () => {
  assert.equal(routeEditHref({ ...FIXTURE_ROUTES[0], stops: [] }), undefined);
});

test("descriptionToText unwraps Portable Text and plain arrays", () => {
  assert.equal(
    descriptionToText([
      { _type: "block", children: [{ _type: "span", text: "First line." }] },
      { _type: "block", children: [{ _type: "span", text: "Second " }, { _type: "span", text: "line." }] },
    ]),
    "First line.\n\nSecond line.",
  );
  assert.equal(descriptionToText(["One", "Two"]), "One\n\nTwo");
  assert.equal(descriptionToText(undefined), "");
  // An unrecognised block contributes nothing rather than "[object Object]".
  assert.equal(descriptionToText([{ _type: "image", asset: {} }]), "");
});

test("optional fields stay absent instead of becoming empty strings", () => {
  const bare = toExchangeRoute({
    slug: "x",
    title: "T",
    map: { slug: "autumn-leaves" },
    race: "human",
    level: "standard",
    summary: "s",
    author: "a",
    stops: [{ campId: "c01" }],
  });
  assert.equal(bare.hero, undefined);
  assert.equal(bare.build, undefined);
  assert.equal(bare.patch, undefined);
  assert.equal(bare.description, undefined);
});

/* Builds get the same loop; the payload shape differs (steps, difficulty). */
test("a build round-trips to its submit form and names what it replaces", async () => {
  const { buildEditHref } = await import("../builds/edit-link.mjs");
  const { decodeFromHash } = await import("../builds/exchange-codec.mjs");

  const build = {
    slug: "archmage-one-camp-into-expansion",
    title: "Archmage One Camp into Expansion",
    race: "human",
    vsRaces: ["orc"],
    difficulty: "beginner",
    tags: ["expand"],
    summary: "A summary that is comfortably over twenty characters long.",
    author: "Gym coaches",
    steps: [
      { supply: 6, instruction: "Build a farm", icon: "hu-farm" },
      { time: "1:30", supply: 10, instruction: "Altar" },
    ],
    description: [{ _type: "block", children: [{ _type: "span", text: "Notes here." }] }],
  };

  const href = buildEditHref(build);
  assert.ok(href.startsWith("/learn/builds/submit#build="), href);

  const payload = JSON.parse(decodeFromHash(href.slice(href.indexOf("=") + 1)));
  assert.equal(payload.format, "wc3gym-build");
  assert.equal(payload.build.supersedes, build.slug);
  assert.equal(payload.build.title, build.title);
  assert.equal(payload.build.difficulty, "beginner");
  assert.deepEqual(payload.build.steps, [
    { supply: 6, instruction: "Build a farm", icon: "hu-farm" },
    { time: "1:30", supply: 10, instruction: "Altar" },
  ]);
  assert.equal(payload.build.description, "Notes here.");
});

test("a build with no steps gets no link", async () => {
  const { buildEditHref } = await import("../builds/edit-link.mjs");
  assert.equal(buildEditHref({ slug: "x", title: "T", steps: [] }), undefined);
});

/* ------------------------------------------------------------------ *
 *  Sanity-shaped input
 *
 *  Fixtures leave an unset optional field `undefined`, which JSON.stringify
 *  drops. Sanity returns `null`, which serialises. So a payload built from a
 *  published route carried `"start": null`, the schema's `.optional()`
 *  rejected it, and the submit form — which ignores a payload it cannot
 *  parse — came up blank. Every check passed beforehand, because every
 *  check used a fixture.
 * ------------------------------------------------------------------ */

test("a route straight from Sanity, with nulls for unset fields, still round-trips", () => {
  const fromSanity = {
    slug: "dh-fast-3rd-level-2d9a",
    title: "DH fast 3rd level",
    map: { slug: "shallow-grave", name: "Shallow Grave" },
    race: "nightelf",
    vsRaces: [],
    level: "standard",
    start: null,
    hero: "ne-demon-hunter",
    build: null,
    patch: null,
    tags: [],
    summary: "You start with lightning shield creep, then rogue camp for level 2.",
    author: "AllSupGoToHeaven",
    authorDiscord: "allsupsgotoheaven",
    sourceUrl: null,
    description: null,
    stops: [{ campId: "c14" }, { campId: "c05" }, { campId: "c10" }],
  };

  const payload = toExchangeRoute(fromSanity);
  // `null` must not survive into the JSON: `.optional()` accepts `undefined`,
  // never `null`.
  const json = JSON.stringify({ format: "wc3gym-creep-route", route: payload });
  assert.ok(!json.includes("null"), `payload still carries a null: ${json}`);

  const decoded = decodeHref(routeEditHref(fromSanity)).route;
  assert.equal(decoded.supersedes, fromSanity.slug);
  assert.equal(decoded.stops.length, 3);
  assert.equal("start" in decoded, false, "an unset start should be absent, not null");
});

test("start 0 is preserved — it is a real spawn index, not an absent value", () => {
  const payload = toExchangeRoute({
    slug: "x",
    title: "T",
    map: { slug: "autumn-leaves" },
    race: "human",
    level: "standard",
    summary: "s",
    author: "a",
    start: 0,
    stops: [{ campId: "c01" }],
  });
  assert.equal(payload.start, 0);
});

test("a build step's supply survives the same treatment", async () => {
  const { toExchangeBuild } = await import("../builds/edit-link.mjs");
  const payload = toExchangeBuild({
    slug: "b",
    title: "T",
    race: "human",
    steps: [
      { instruction: "Farm", supply: null },
      { instruction: "Altar", supply: 0 },
    ],
  });
  assert.equal("supply" in payload.steps[0] && payload.steps[0].supply === null, false);
  assert.equal(payload.steps[1].supply, 0);
});

test("a legacy free-text patch survives 'Suggest an update' as a real option", async () => {
  // The patch field used to be a free text box; one published build carries
  // "> 2.0.0". The exchange payload stays lenient so it is not lost in
  // transit, and the form normalises it to a value the select can show and
  // the submission schema accepts.
  const { toExchangeBuild } = await import("../builds/edit-link.mjs");
  const { normalizePatch, isKnownPatch } = await import("../patches.mjs");

  const payload = toExchangeBuild({ slug: "b", title: "T", race: "human", patch: "> 2.0.0", steps: [{ instruction: "Farm" }] });
  assert.equal(payload.patch, "> 2.0.0", "the exchange carries what is published, verbatim");

  const prefilled = normalizePatch(payload.patch) ?? "";
  assert.equal(prefilled, "2.0");
  assert.equal(isKnownPatch(prefilled), true, "so resubmitting it does not fail validation");
});
