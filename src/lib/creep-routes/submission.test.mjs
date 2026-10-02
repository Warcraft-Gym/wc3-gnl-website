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

test("patch must be one from the list, or blank", () => {
  assert.equal(schema().safeParse(payload({ patch: "3.0" })).success, true);
  assert.equal(schema().safeParse(payload({ patch: "" })).success, true, "the field is optional");
  assert.equal(schema().safeParse(payload()).success, true, "absent is fine too");

  const bad = schema().safeParse(payload({ patch: "2.0.9" }));
  assert.equal(bad.success, false, "a version we do not list must not get through");
  assert.ok(flattenErrors(bad.error).patch);

  assert.equal(schema().safeParse(payload({ patch: "whatever" })).success, false);
  assert.equal(schema().safeParse(payload({ patch: "> 2.0.0" })).success, false, "the old free-text shape is what this replaces");
});

test("a blank patch is dropped from the draft rather than stored as an empty string", () => {
  const parsed = schema().safeParse(payload({ patch: "" }));
  assert.equal(parsed.success, true);
  const draft = toCreepRouteDraft(parsed.data, "creepMap-autumn-leaves");
  assert.equal(draft.patch, undefined);
});

test("kills: checked against the camp's creep rows when counts are known", () => {
  const s = createSubmissionSchema({
    maps: [{ slug: "autumn-leaves", campIds: ["c01", "c02"], creepCounts: { c01: [1, 2], c02: [3] } }],
    iconKeys,
  });
  const ok = s.safeParse(payload({ stops: [{ campId: "c01", kills: [{ row: 1, n: 2 }] }, { campId: "c02" }] }));
  assert.equal(ok.success, true);
  const draft = toCreepRouteDraft(ok.data, "creepMap-autumn-leaves");
  assert.deepEqual(draft.stops[0].kills.map(({ row, n }) => ({ row, n })), [{ row: 1, n: 2 }]);
  assert.equal(draft.stops[1].kills, undefined);

  const bad = s.safeParse(payload({ stops: [{ campId: "c01", kills: [{ row: 1, n: 3 }] }, { campId: "c02" }] }));
  assert.equal(bad.success, false);
  assert.match(flattenErrors(bad.error)["stops.0.kills"], /More kills/);

  const base = s.safeParse(payload({ stops: [{ campId: null, action: "TP home", kills: [{ row: 0, n: 1 }] }, { campId: "c02" }] }));
  assert.equal(base.success, false);
});

test("leaveRest is kept only on a camp stop with a kill order", () => {
  const s = createSubmissionSchema({
    maps: [{ slug: "autumn-leaves", campIds: ["c01", "c02"], creepCounts: { c01: [1, 2], c02: [3] } }],
    iconKeys,
  });
  const ok = s.safeParse(
    payload({ stops: [{ campId: "c01", kills: [{ row: 0, n: 1 }], leaveRest: true }, { campId: "c02", leaveRest: true }] }),
  );
  assert.equal(ok.success, true);
  const draft = toCreepRouteDraft(ok.data, "creepMap-autumn-leaves");
  assert.equal(draft.stops[0].leaveRest, true);
  assert.equal(draft.stops[1].leaveRest, undefined);
});

test("kill sets: kept on the draft, and a split set is rejected", () => {
  const s = createSubmissionSchema({
    maps: [{ slug: "autumn-leaves", campIds: ["c01", "c02"], creepCounts: { c01: [1, 2, 1], c02: [3] } }],
    iconKeys,
  });
  const ok = s.safeParse(payload({ stops: [{ campId: "c01", kills: [{ row: 0, n: 1, set: 0 }, { row: 2, n: 1, set: 0 }] }, { campId: "c02" }] }));
  assert.equal(ok.success, true);
  const draft = toCreepRouteDraft(ok.data, "creepMap-autumn-leaves");
  assert.deepEqual(draft.stops[0].kills.map(({ row, n, set }) => ({ row, n, set })), [{ row: 0, n: 1, set: 0 }, { row: 2, n: 1, set: 0 }]);
  const bad = s.safeParse(payload({ stops: [{ campId: "c01", kills: [{ row: 0, n: 1, set: 0 }, { row: 1, n: 1 }, { row: 2, n: 1, set: 0 }] }, { campId: "c02" }] }));
  assert.equal(bad.success, false);
  assert.match(flattenErrors(bad.error)["stops.0.kills"], /next to each other/);
});

const placeMaps = [{ slug: "autumn-leaves", campIds: ["c01", "c02"], startIds: ["0", "1"], mineCount: 2, shopIds: ["nmrk-6"] }];

test("place: needs campId null and an action, and lands on the draft", () => {
  const s = createSubmissionSchema({ maps: placeMaps, iconKeys });
  // A shop visit is a waypoint and takes no number, so two camps still make the two stops.
  const ok = s.safeParse(payload({ stops: [{ campId: null, action: "Buy circlet", place: { kind: "shop", at: { shop: "nmrk-6" } } }, { campId: "c01" }, { campId: "c02" }] }));
  assert.equal(ok.success, true);
  assert.deepEqual(toCreepRouteDraft(ok.data, "creepMap-autumn-leaves").stops[0].place, { kind: "shop", at: { shop: "nmrk-6" } });

  const noAction = s.safeParse(payload({ stops: [{ campId: null, place: { kind: "attack", at: { start: "1" } } }, { campId: "c01" }] }));
  assert.equal(flattenErrors(noAction.error)["stops.0.action"], "Say what happens here");
  const onCamp = s.safeParse(payload({ stops: [{ campId: "c01", action: "Harass", place: { kind: "attack", at: { start: "1" } } }, { campId: "c02" }] }));
  assert.equal(flattenErrors(onCamp.error)["stops.0.place"], "A place stop has no camp");
});

test("place: an id the map does not have is rejected; a point must sit inside the map", () => {
  const s = createSubmissionSchema({ maps: placeMaps, iconKeys });
  const shop = s.safeParse(payload({ stops: [{ campId: null, action: "Buy", place: { kind: "shop", at: { shop: "ngme-1" } } }, { campId: "c01" }] }));
  assert.equal(flattenErrors(shop.error)["stops.0.place"], 'Unknown shop "ngme-1" on this map');
  const mine = s.safeParse(payload({ stops: [{ campId: null, action: "Expand", place: { kind: "expand", at: { mine: "2" } } }, { campId: "c01" }] }));
  assert.match(flattenErrors(mine.error)["stops.0.place"], /Unknown gold mine/);
  const point = s.safeParse(payload({ stops: [{ campId: null, action: "Wait", place: { kind: "build", at: { x: 1.2, y: 0.5 } } }, { campId: "c01" }] }));
  assert.equal(point.success, false);
});

test("hero: false is kept on a camp or attack stop and rejected on a waypoint or base action", () => {
  const s = createSubmissionSchema({ maps: placeMaps, iconKeys });
  const ok = s.safeParse(payload({ stops: [{ campId: "c01" }, { campId: "c02", hero: false }, { campId: null, action: "Harass", place: { kind: "attack", at: { start: "1" } }, hero: false }] }));
  assert.equal(ok.success, true);
  const draft = toCreepRouteDraft(ok.data, "creepMap-autumn-leaves");
  assert.equal(draft.stops[1].hero, false);
  assert.equal(draft.stops[2].hero, false);
  assert.equal(draft.stops[0].hero, undefined);
  const onWaypoint = s.safeParse(payload({ stops: [{ campId: null, action: "Plant", place: { kind: "build", at: { x: 0.2, y: 0.2 } }, hero: false }, { campId: "c01" }, { campId: "c02" }] }));
  assert.equal(flattenErrors(onWaypoint.error)["stops.0.hero"], "Only a camp or attack stop can go without the hero");
});

// "either" builds an "or" split (choose one), "both" an "and" split (all at once).
const forkStop = (mode, arms) => ({ campId: null, split: { mode: mode === "either" ? "or" : "and", arms } });

test("or split: a valid split lands on the draft as a creepSplit with arms of stops", () => {
  const s = createSubmissionSchema({ maps: placeMaps, iconKeys });
  const ok = s.safeParse(
    payload({
      stops: [
        { campId: "c01" },
        forkStop("either", [
          { label: "No one at their natural", stops: [{ campId: "c02", hero: false }] },
          { label: "They are at their natural", stops: [{ campId: null, action: "Harass", place: { kind: "attack", at: { start: "1" } } }] },
        ]),
      ],
    }),
  );
  assert.equal(ok.success, true);
  const fork = toCreepRouteDraft(ok.data, "creepMap-autumn-leaves").stops[1];
  assert.equal(fork._type, "creepSplit");
  assert.equal(fork.arms[0].label, "No one at their natural");
  assert.equal(fork.arms[0].stops[0]._type, "stop");
  assert.equal(fork.arms[0].stops[0].hero, false);
  assert.deepEqual(fork.arms[1].stops[0].place, { kind: "attack", at: { start: "1" } });
  assert.equal(fork.mode, "or");
});

test("nodes: a node inside an arm, an empty arm and a fork without labels are rejected", () => {
  const s = createSubmissionSchema({ maps: placeMaps, iconKeys });
  const inner = forkStop("both", [{ stops: [{ campId: "c01" }] }, { stops: [{ campId: "c02" }] }]);
  const nested = s.safeParse(payload({ stops: [{ campId: "c01" }, forkStop("both", [{ stops: [inner] }, { stops: [{ campId: "c02" }] }])] }));
  assert.equal(flattenErrors(nested.error)["stops.1.split.arms.0.stops.0.split"], "A way cannot hold another split");
  const empty = s.safeParse(payload({ stops: [{ campId: "c01" }, forkStop("both", [{ stops: [] }, { stops: [{ campId: "c02" }] }])] }));
  assert.equal(flattenErrors(empty.error)["stops.1.split.arms.0.stops"], "Add at least one stop to this way");
  const unlabelled = s.safeParse(payload({ stops: [{ campId: "c01" }, forkStop("either", [{ stops: [{ campId: "c01" }] }, { label: "B", stops: [{ campId: "c02" }] }])] }));
  assert.equal(flattenErrors(unlabelled.error)["stops.1.split.arms.0.label"], "Say when to take this way");
  const bothOk = s.safeParse(payload({ stops: [{ campId: "c01" }, forkStop("both", [{ stops: [{ campId: "c01" }] }, { stops: [{ campId: "c02" }] }])] }));
  assert.equal(bothOk.success, true);
  const badCamp = s.safeParse(payload({ stops: [{ campId: "c01" }, forkStop("both", [{ stops: [{ campId: "zz" }] }, { stops: [{ campId: "c02" }] }])] }));
  assert.match(flattenErrors(badCamp.error)["stops.1.split.arms.0.stops.0.campId"], /Unknown camp/);
});

test("a whole-route pair (one fork at index 0 and nothing else) counts as two stops", () => {
  const s = createSubmissionSchema({ maps: placeMaps, iconKeys });
  const pair = s.safeParse(payload({ stops: [forkStop("both", [{ stops: [{ campId: "c01" }] }, { stops: [{ campId: "c02" }] }])] }));
  assert.equal(pair.success, true);
  const lone = s.safeParse(payload({ stops: [{ campId: "c01" }] }));
  assert.equal(flattenErrors(lone.error).stops, "Add at least two stops");
});

test("a fork node carrying any field besides its ways is rejected, not silently dropped", () => {
  const s = createSubmissionSchema({ maps: placeMaps, iconKeys });
  for (const extra of [{ hero: false }, { note: "x" }, { condition: "if" }, { units: [{ icon: "or-grunt", count: 1 }] }]) {
    const r = s.safeParse(payload({ stops: [{ campId: "c01" }, { ...forkStop("both", [{ stops: [{ campId: "c01" }] }, { stops: [{ campId: "c02" }] }]), ...extra }] }));
    assert.equal(flattenErrors(r.error)["stops.1.split"], "A split holds only its ways", JSON.stringify(extra));
  }
});

test("and split: a valid node lands on the draft as a creepSplit without labels", () => {
  const s = createSubmissionSchema({ maps: placeMaps, iconKeys });
  const ok = s.safeParse(payload({ stops: [{ campId: "c01" }, forkStop("both", [{ stops: [{ campId: "c02" }] }, { stops: [{ campId: "c01", hero: false }] }])] }));
  assert.equal(ok.success, true);
  const node = toCreepRouteDraft(ok.data, "creepMap-autumn-leaves").stops[1];
  assert.equal(node._type, "creepSplit");
  assert.equal(node.mode, "and");
  assert.equal("label" in node.arms[0], false);
  assert.equal(node.arms[1].stops[0].hero, false);
});

test("xor split: accepted as the last stop, rejected with stops after it", () => {
  const s = createSubmissionSchema({ maps: placeMaps, iconKeys });
  const xor = { campId: null, split: { mode: "xor", arms: [{ label: "A", stops: [{ campId: "c01" }] }, { label: "B", stops: [{ campId: "c02" }] }] } };
  assert.equal(s.safeParse(payload({ stops: [{ campId: "c01" }, xor] })).success, true);
  const after = s.safeParse(payload({ stops: [{ campId: "c01" }, xor, { campId: "c02" }] }));
  assert.equal(flattenErrors(after.error)["stops.1.split"], "Nothing follows an either/or split");
});
