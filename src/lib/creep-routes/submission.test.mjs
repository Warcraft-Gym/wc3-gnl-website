import { test } from "node:test";
import assert from "node:assert/strict";
import { createSubmissionSchema, flattenErrors, toCreepRouteDraft } from "./submission.mjs";

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
      { campId: "c01", time: "0:15" },
      { campId: "c02", time: "1:30" },
    ],
    website: "",
    ...overrides,
  };
}

function schema(opts = {}) {
  return createSubmissionSchema({ maps, iconKeys, ...opts });
}

test("rejects fewer than 2 stops", () => {
  const result = schema().safeParse(payload({ stops: [{ campId: "c01", time: "0:15" }] }));
  assert.equal(result.success, false);
  assert.ok(flattenErrors(result.error).stops);
});

test("accepts exactly 2 stops", () => {
  const result = schema().safeParse(payload());
  assert.equal(result.success, true);
});

test("rejects a campId not on the chosen map", () => {
  const result = schema().safeParse(
    payload({ stops: [{ campId: "c01", time: "0:15" }, { campId: "zz9", time: "1:30" }] }),
  );
  assert.equal(result.success, false);
  const errors = flattenErrors(result.error);
  assert.equal(errors["stops.1.campId"], 'Unknown camp "zz9" on this map');
});

test("a campId valid on a different map is still rejected for the chosen map", () => {
  // c03 exists on autumn-leaves but not on echo-isles.
  const result = schema().safeParse(
    payload({ map: "echo-isles", stops: [{ campId: "c01", time: "0:15" }, { campId: "c03", time: "1:30" }] }),
  );
  assert.equal(result.success, false);
});

test('accepts "1:30" and "16:30", both normalised to real seconds (90)', () => {
  const result = schema().safeParse(
    payload({ stops: [{ campId: "c01", time: "1:30" }, { campId: "c02", time: "16:30" }] }),
  );
  assert.equal(result.success, true);
  assert.equal(result.data.stops[0].time, 90);
  assert.equal(result.data.stops[1].time, 90);
});

test("rejects an unparsable time", () => {
  const result = schema().safeParse(
    payload({ stops: [{ campId: "c01", time: "not a clock" }, { campId: "c02", time: "1:30" }] }),
  );
  assert.equal(result.success, false);
  assert.ok(flattenErrors(result.error)["stops.0.time"]);
});

test("a base-action stop (campId null) requires an action", () => {
  const result = schema().safeParse(
    payload({ stops: [{ campId: null, time: "0:05" }, { campId: "c01", time: "0:15" }] }),
  );
  assert.equal(result.success, false);
  assert.ok(flattenErrors(result.error)["stops.0.action"]);
});

test("a base-action stop with an action is accepted and campId comes back null", () => {
  const result = schema().safeParse(
    payload({
      stops: [
        { campId: null, action: "TP home", time: "0:05" },
        { campId: "c01", time: "0:15" },
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
        { campId: "c01", time: "0:15", units: [{ icon: "not-a-real-icon", count: 1 }] },
        { campId: "c02", time: "1:30" },
      ],
    }),
  );
  assert.equal(result.success, false);
});

test("accepts a known bring icon and count", () => {
  const result = schema().safeParse(
    payload({
      stops: [
        { campId: "c01", time: "0:15", units: [{ icon: "hu-archmage", count: 1 }] },
        { campId: "c02", time: "1:30" },
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
    payload({ map: "twisted-meadows", start: 3, stops: [{ campId: "c01", time: "0:15" }, { campId: "c02", time: "1:30" }] }),
  );
  assert.equal(result.success, true);
  assert.equal(result.data.start, 3);
});

test("start is optional and defaults to undefined (not 0) when omitted", () => {
  const result = schema().safeParse(payload());
  assert.equal(result.success, true);
  assert.equal(result.data.start, undefined);
});

test("rejects a filled honeypot", () => {
  const result = schema().safeParse(payload({ website: "http://spam.example" }));
  assert.equal(result.success, false);
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
  const draft = toCreepRouteDraft(result.data, "creepMap.autumn-leaves");
  assert.equal(draft._type, "creepRoute");
  assert.equal(draft.reviewStatus, "pending");
  assert.match(draft._id, /^drafts\./);
  assert.deepEqual(draft.map, { _type: "reference", _ref: "creepMap.autumn-leaves" });
  assert.equal(draft.stops.length, 2);
  assert.equal(draft.stops[0].time, "0:15");
  assert.equal(draft.build, undefined);
});

test("toCreepRouteDraft() references the companion build when given one", () => {
  const result = schema().safeParse(payload());
  assert.equal(result.success, true);
  const draft = toCreepRouteDraft(result.data, "creepMap.autumn-leaves", "buildOrder.abc123");
  assert.deepEqual(draft.build, { _type: "reference", _ref: "buildOrder.abc123" });
});
