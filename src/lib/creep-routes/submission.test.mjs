import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createSubmissionSchema,
  decideSubmission,
  flattenErrors,
  MAX_STOPS_JSON_BYTES,
  slugFromInput,
  stopsJsonTooLarge,
  toCreepRouteDraft,
} from "./submission.mjs";

const maps = [
  { slug: "autumn-leaves", campIds: ["c01", "c02", "c03"], startsCount: 2 },
  { slug: "echo-isles", campIds: ["c01", "c02"] },
  { slug: "twisted-meadows", campIds: ["c01", "c02"], startsCount: 4 },
];
const iconKeys = ["hu-archmage", "nt-scroll-of-town-portal", "or-grunt"];

function payload(overrides = {}) {
  return {
    map: "autumn-leaves",
    race: "human",
    vsRaces: [],
    level: "standard",
    title: "A fine test route title",
    summary: "This is a summary that is at least twenty characters long.",
    author: "Tester",
    stops: [
      { campId: "c01" },
      { campId: "c02" },
    ],
    website: "",
    ...overrides,
  };
}

function schema(opts = {}) {
  return createSubmissionSchema({ maps, iconKeys, ...opts });
}

test("rejects fewer than 2 stops", () => {
  const result = schema().safeParse(payload({ stops: [{ campId: "c01" }] }));
  assert.equal(result.success, false);
  assert.ok(flattenErrors(result.error).stops);
});

test("accepts exactly 2 stops", () => {
  const result = schema().safeParse(payload());
  assert.equal(result.success, true);
});

test("a stop has no time field: the schema never parses or emits one", () => {
  const result = schema().safeParse(payload());
  assert.equal(result.success, true);
  for (const stop of result.data.stops) {
    assert.ok(!("time" in stop), "a parsed stop must not carry a time field");
  }
});

test("rejects a campId not on the chosen map", () => {
  const result = schema().safeParse(
    payload({ stops: [{ campId: "c01" }, { campId: "zz9" }] }),
  );
  assert.equal(result.success, false);
  const errors = flattenErrors(result.error);
  assert.equal(errors["stops.1.campId"], 'Unknown camp "zz9" on this map');
});

test("a campId valid on a different map is still rejected for the chosen map", () => {
  // c03 exists on autumn-leaves but not on echo-isles.
  const result = schema().safeParse(
    payload({ map: "echo-isles", stops: [{ campId: "c01" }, { campId: "c03" }] }),
  );
  assert.equal(result.success, false);
});

test("a base-action stop (campId null) requires an action", () => {
  const result = schema().safeParse(
    payload({ stops: [{ campId: null }, { campId: "c01" }] }),
  );
  assert.equal(result.success, false);
  assert.ok(flattenErrors(result.error)["stops.0.action"]);
});

test("a base-action stop with an action is accepted and campId comes back null", () => {
  const result = schema().safeParse(
    payload({
      stops: [
        { campId: null, action: "TP home" },
        { campId: "c01" },
      ],
    }),
  );
  assert.equal(result.success, true);
  assert.equal(result.data.stops[0].campId, null);
  assert.equal(result.data.stops[0].action, "TP home");
});

test("rejects an unknown bring icon", () => {
  const result = schema().safeParse(
    payload({
      stops: [
        { campId: "c01", units: [{ icon: "not-a-real-icon", count: 1 }] },
        { campId: "c02" },
      ],
    }),
  );
  assert.equal(result.success, false);
});

test("accepts a known bring icon and count", () => {
  const result = schema().safeParse(
    payload({
      stops: [
        { campId: "c01", units: [{ icon: "hu-archmage", count: 1 }] },
        { campId: "c02" },
      ],
    }),
  );
  assert.equal(result.success, true);
  assert.deepEqual(result.data.stops[0].units, [{ icon: "hu-archmage", count: 1 }]);
});

test("rejects start >= the chosen map's starts.length", () => {
  const result = schema().safeParse(payload({ start: 5 }));
  assert.equal(result.success, false);
  assert.ok(flattenErrors(result.error).start);
});

test("accepts a valid start index on a >2-start map", () => {
  const result = schema().safeParse(
    payload({ map: "twisted-meadows", start: 3, stops: [{ campId: "c01" }, { campId: "c02" }] }),
  );
  assert.equal(result.success, true);
  assert.equal(result.data.start, 3);
});

test("start is optional and defaults to undefined (not 0) when omitted", () => {
  const result = schema().safeParse(payload());
  assert.equal(result.success, true);
  assert.equal(result.data.start, undefined);
});

test("accepts a filled honeypot at the schema level (the decision happens post-parse, see decideSubmission)", () => {
  // The schema no longer rejects a nonempty `website` itself — rejecting it
  // there made the honeypot check dead code (code-a.md, "Should fix"). A
  // filled honeypot still gets a silent fake-ok, just decided afterwards.
  const result = schema().safeParse(payload({ website: "http://spam.example" }));
  assert.equal(result.success, true);
  assert.equal(result.data.website, "http://spam.example");
});

test("rejects an unknown map", () => {
  const result = schema().safeParse(payload({ map: "not-a-real-map" }));
  assert.equal(result.success, false);
});

test("createSubmissionSchema throws without at least one map", () => {
  assert.throws(() => createSubmissionSchema({ maps: [], iconKeys }));
});

test("toCreepRouteDraft() produces a pending draft referencing the map", () => {
  const result = schema().safeParse(payload());
  assert.equal(result.success, true);
  const draft = toCreepRouteDraft(result.data, "creepMap-autumn-leaves");
  assert.equal(draft._type, "creepRoute");
  assert.equal(draft.reviewStatus, "pending");
  assert.match(draft._id, /^drafts\./);
  assert.deepEqual(draft.map, { _type: "reference", _ref: "creepMap-autumn-leaves" });
  assert.equal(draft.stops.length, 2);
  assert.ok(!("time" in draft.stops[0]), "a draft stop must not carry a time field");
  assert.equal(draft.build, undefined);
});

test("toCreepRouteDraft() references the companion build when given one", () => {
  const result = schema().safeParse(payload());
  assert.equal(result.success, true);
  const draft = toCreepRouteDraft(result.data, "creepMap-autumn-leaves", "buildOrder-abc123");
  assert.deepEqual(draft.build, { _type: "reference", _ref: "buildOrder-abc123" });
});

test("tags survive the schema transform (comma list, trimmed, lowercased, capped at 8)", () => {
  const result = schema().safeParse(payload({ tags: " Fast-Expand, Archmage ,Archmage, a,b,c,d,e,f,g " }));
  assert.equal(result.success, true);
  assert.deepEqual(result.data.tags, ["fast-expand", "archmage", "archmage", "a", "b", "c", "d", "e"]);
});

test("toCreepRouteDraft() carries tags through to the draft", () => {
  const result = schema().safeParse(payload({ tags: "fast-expand, archmage" }));
  assert.equal(result.success, true);
  const draft = toCreepRouteDraft(result.data, "creepMap-autumn-leaves");
  assert.deepEqual(draft.tags, ["fast-expand", "archmage"]);
});

test("toCreepRouteDraft() carries an empty tags array through when none were given", () => {
  const result = schema().safeParse(payload());
  assert.equal(result.success, true);
  const draft = toCreepRouteDraft(result.data, "creepMap-autumn-leaves");
  assert.deepEqual(draft.tags, []);
});

test("stopsJsonTooLarge: a string at the cap is accepted, one byte over is rejected", () => {
  const atCap = "a".repeat(MAX_STOPS_JSON_BYTES);
  const overCap = "a".repeat(MAX_STOPS_JSON_BYTES + 1);
  assert.equal(stopsJsonTooLarge(atCap), false);
  assert.equal(stopsJsonTooLarge(overCap), true);
});

test("stopsJsonTooLarge: an ordinary small payload is accepted", () => {
  assert.equal(stopsJsonTooLarge(JSON.stringify([{ campId: "c01" }, { campId: "c02" }])), false);
});

test("decideSubmission: a filled honeypot fakes success", () => {
  const decision = decideSubmission({ website: "http://spam.example" });
  assert.deepEqual(decision, { action: "fake-ok" });
});

test("decideSubmission: an empty honeypot and no startedAt proceeds", () => {
  const decision = decideSubmission({ website: "" });
  assert.deepEqual(decision, { action: "proceed" });
});

test("decideSubmission: submitted faster than minFillSeconds rejects", () => {
  const now = 1_000_000;
  const decision = decideSubmission({ website: "", startedAt: now - 3000 }, { now, minFillSeconds: 8 });
  assert.deepEqual(decision, { action: "reject", reason: "too-fast" });
});

test("decideSubmission: submitted after minFillSeconds proceeds", () => {
  const now = 1_000_000;
  const decision = decideSubmission({ website: "", startedAt: now - 9000 }, { now, minFillSeconds: 8 });
  assert.deepEqual(decision, { action: "proceed" });
});

test("decideSubmission: the honeypot check wins over the fill-time check", () => {
  const now = 1_000_000;
  const decision = decideSubmission(
    { website: "http://spam.example", startedAt: now - 9000 },
    { now, minFillSeconds: 8 },
  );
  assert.deepEqual(decision, { action: "fake-ok" });
});

/* ------------------------------------------------------------------ *
 *  Superseding: how an author "edits" a submission without accounts
 * ------------------------------------------------------------------ */

test("slugFromInput accepts a bare slug, a path, or a full URL", () => {
  const want = "human-archmage-autumn-leaves";
  assert.equal(slugFromInput(want), want);
  assert.equal(slugFromInput(`/learn/creep-routes/${want}`), want);
  assert.equal(slugFromInput(`https://warcraft3.gym/learn/creep-routes/${want}`), want);
  assert.equal(slugFromInput(`https://warcraft3.gym/learn/creep-routes/${want}/`), want);
  assert.equal(slugFromInput(`https://warcraft3.gym/learn/creep-routes/${want}?from=discord`), want);
  assert.equal(slugFromInput(`https://warcraft3.gym/learn/creep-routes/${want}#stops`), want);
});

test("slugFromInput returns something rejectable rather than guessing", () => {
  // Not slug-shaped: better to hand the lookup a value it will fail to match
  // (and log) than to silently pick some other route.
  assert.equal(slugFromInput("   "), "");
  assert.equal(slugFromInput("https://warcraft3.gym/"), "warcraft3.gym");
});

test("a submission naming no predecessor carries no supersedes reference", () => {
  const result = schema().safeParse(payload());
  assert.equal(result.success, true, JSON.stringify(result.error?.issues));
  assert.equal(result.data.supersedes, undefined);
  const draft = toCreepRouteDraft(result.data, "creepMap-autumn-leaves");
  assert.equal(draft.supersedes, undefined);
});

test("a resubmission carries the reference and still arrives pending", () => {
  const result = schema().safeParse({
    ...payload(),
    supersedes: "https://warcraft3.gym/learn/creep-routes/old-route-1a2b",
  });
  assert.equal(result.success, true, JSON.stringify(result.error?.issues));
  assert.equal(result.data.supersedes, "old-route-1a2b");

  const draft = toCreepRouteDraft(result.data, "creepMap-autumn-leaves", undefined, "creepRoute-old");
  assert.deepEqual(draft.supersedes, { _type: "reference", _ref: "creepRoute-old" });
  // The point of the whole design: an "edit" is reviewed, never published
  // straight over an approved route.
  assert.equal(draft.reviewStatus, "pending");
  assert.match(String(draft._id), /^drafts\./);
});

/* ------------------------------------------------------------------ *
 *  Video
 * ------------------------------------------------------------------ */

test("a YouTube or Vimeo link is accepted and carried into the draft", () => {
  for (const url of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?t=42",
    "https://vimeo.com/123456789",
  ]) {
    const result = schema().safeParse({ ...payload(), videoUrl: url });
    assert.equal(result.success, true, `${url}: ${JSON.stringify(result.error?.issues)}`);
    const draft = toCreepRouteDraft(result.data, "creepMap-autumn-leaves");
    assert.equal(draft.videoUrl, url, "the original URL is stored; embedding happens at render");
  }
});

test("a link we cannot embed is rejected at submit time, not silently dropped", () => {
  // Better to tell the author now than to render a bare link they did not
  // ask for on a page they cannot edit.
  const result = schema().safeParse({ ...payload(), videoUrl: "https://twitch.tv/someone" });
  assert.equal(result.success, false);
  assert.equal(result.error.issues[0].path.join("."), "videoUrl");
  assert.match(result.error.issues[0].message, /YouTube or Vimeo/);
});

test("no video is still a valid route", () => {
  const result = schema().safeParse(payload());
  assert.equal(result.success, true);
  assert.equal(toCreepRouteDraft(result.data, "creepMap-autumn-leaves").videoUrl, undefined);
});
