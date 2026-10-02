/**
 * Every kill-order shape an author can build in the submit form, built only
 * through the builder's own helpers in the order the clicks call them
 * (StopRow's KillOrderField), then checked through validation, unit
 * derivation, deriveRoute, the submission schema, the edit-link exchange
 * payload and the API serializer. Camp: Last Refuge c12, four rows, the
 * Trapper row has two creeps.
 */
import assert from "node:assert/strict";
import test from "node:test";
import lastRefuge from "./maps/last-refuge.json" with { type: "json" };
import { addKill, joinWithPrevious, killUnits, killsProblem, removeKillAt, splitSet, validKills, flatKillItems } from "./kills.mjs";
import { deriveRoute } from "./derive.mjs";
import { createSubmissionSchema, toCreepRouteDraft } from "./submission.mjs";
import { IMPORT_HASH_KEY, decodeFromHash } from "./exchange-codec.mjs";
import { routeEditHref, toExchangeRoute } from "./edit-link.mjs";
import { toApiRoute, toApiStop } from "./serialize.mjs";

const CAMP = lastRefuge.camps.find((c) => c.id === "c12");
const COUNTS = CAMP.creeps.map((c) => c.count);
const [GOLEM, TRAPPER, MUD, PRIEST] = [0, 1, 2, 3];

test("c12 is the camp these shapes assume", () => {
  assert.deepEqual(COUNTS, [1, 2, 1, 1]);
  assert.deepEqual(CAMP.creeps.map((c) => c.name), ["Rock Golem", "Forest Troll Trapper", "Mud Golem", "Forest Troll High Priest"]);
});

/** The builder's state and its click handlers, as KillOrderField wires them. */
function builder() {
  const s = { kills: [], leaveRest: false };
  const valid = () => validKills(CAMP, s.kills);
  return {
    s,
    add(row) { s.kills = addKill(s.kills, row, COUNTS); return this; },
    remove(i) { s.kills = removeKillAt(valid(), i); return this; },
    join(i) { s.kills = joinWithPrevious(valid(), i); return this; },
    split(i) { s.kills = splitSet(valid(), flatKillItems(valid())[i]?.set); return this; },
    leave(v) { s.leaveRest = v; return this; },
    clear() { s.kills = []; s.leaveRest = false; return this; },
  };
}

/** `[row, unit, inSet]` per kill; `ordered` follows from the shape. */
const unitsOf = (stop) => killUnits(CAMP, stop.kills, stop.leaveRest).map((k) => [k.row, k.unit, k.inSet]);

const ALL_CAMPS = lastRefuge.camps.map((c) => c.id);
const CREEP_COUNTS = Object.fromEntries(lastRefuge.camps.map((c) => [c.id, c.creeps.map((k) => k.count)]));
const schema = createSubmissionSchema({ maps: [{ slug: "last-refuge", campIds: ALL_CAMPS, creepCounts: CREEP_COUNTS }], iconKeys: [] });

function payload(stop) {
  return {
    map: "last-refuge",
    race: "human",
    vsRaces: [],
    level: "standard",
    title: "Kill order permutations",
    summary: "A route that only exists to test kill orders.",
    author: "Tester",
    stops: [{ campId: "c12", ...stop }, { campId: ALL_CAMPS.find((id) => id !== "c12") }],
    website: "",
  };
}

/** Runs every layer on one built stop against the expected units. */
function checkShape(stop, expected) {
  // (1) validation
  assert.equal(killsProblem(stop.kills, COUNTS), null);
  // (2) units
  assert.deepEqual(unitsOf(stop), expected.units);
  // (3) derive
  const d = deriveRoute({ stops: [{ campId: "c12", ...stop }] }, lastRefuge).stops[0];
  assert.equal(d.kills.length, expected.units.length);
  assert.equal(d.left, expected.left);
  assert.deepEqual(d.kills.map((k) => [k.row, k.unit, k.inSet]), expected.units);
  assert.deepEqual(d.kills.map((k) => k.ordered), expected.ordered);
  // (4) submission schema accepts the stop and the Sanity draft keeps set and leaveRest
  const parsed = schema.safeParse(payload(stop));
  assert.equal(parsed.success, true, parsed.success ? "" : JSON.stringify(parsed.error.issues));
  const keptLeave = stop.kills.length && stop.leaveRest ? true : undefined;
  assert.deepEqual(parsed.data.stops[0].kills, stop.kills);
  const draftStop = toCreepRouteDraft(parsed.data, "creepMap-last-refuge").stops[0];
  assert.deepEqual(draftStop.kills?.map(({ row, n, set }) => (set === undefined ? { row, n } : { row, n, set })), stop.kills.length ? stop.kills : undefined);
  assert.equal(draftStop.leaveRest, keptLeave);
  // (5) edit link: exchange payload through the hash codec and back
  const route = { slug: "perm", title: "t", map: { slug: "last-refuge" }, stops: [{ campId: "c12", ...stop }] };
  const href = routeEditHref(route);
  const json = decodeFromHash(href.split(`#${IMPORT_HASH_KEY}=`)[1]);
  const back = JSON.parse(json).route.stops[0];
  assert.deepEqual(back, JSON.parse(JSON.stringify(toExchangeRoute(route).stops[0])));
  assert.deepEqual(back.kills, stop.kills.length ? stop.kills : undefined);
  assert.equal(back.leaveRest, keptLeave);
  // (6) serializer
  const api = toApiStop({ campId: "c12", ...stop }, "https://x", (i) => i);
  assert.deepEqual(api.kills, stop.kills);
  assert.equal(api.leaveRest, stop.leaveRest);
  const detail = toApiRoute({ ...route, stops: [{ campId: "c12", ...stop }] }, lastRefuge, "https://x", (i) => i, deriveRoute);
  assert.equal(detail.derived.stops[0].left, expected.left);
  assert.equal(detail.derived.stops[0].xpAfter, d.xpAfter);
  return d;
}

const T = (row, unit) => [row, unit, false];
const S = (row, unit) => [row, unit, true];

test("S1 full explicit order of every creep", () => {
  const b = builder().add(PRIEST).add(GOLEM).add(TRAPPER).add(TRAPPER).add(MUD);
  assert.deepEqual(b.s.kills, [{ row: 3, n: 1 }, { row: 0, n: 1 }, { row: 1, n: 2 }, { row: 2, n: 1 }]);
  checkShape(b.s, { units: [T(3, 0), T(0, 1), T(1, 2), T(1, 3), T(2, 4)], ordered: [true, true, true, true, true], left: 0 });
});

test("S2 one ordered kill, then the rest as the default set", () => {
  const b = builder().add(PRIEST);
  assert.deepEqual(b.s, { kills: [{ row: 3, n: 1 }], leaveRest: false });
  checkShape(b.s, { units: [T(3, 0), S(0, 1), S(1, 1), S(1, 1), S(2, 1)], ordered: [true, false, false, false, false], left: 0 });
});

test("S3 one ordered kill, then leave the rest", () => {
  const b = builder().add(PRIEST).leave(true);
  const d = checkShape(b.s, { units: [T(3, 0)], ordered: [true], left: 4 });
  assert.equal(d.kills[0].creep.name, "Forest Troll High Priest");
});

test("S4 a leading set of two different rows, then the remainder", () => {
  const b = builder().add(PRIEST).add(GOLEM).join(1);
  assert.deepEqual(b.s.kills, [{ row: 3, n: 1, set: 0 }, { row: 0, n: 1, set: 0 }]);
  checkShape(b.s, { units: [S(3, 0), S(0, 0), S(1, 1), S(1, 1), S(2, 1)], ordered: [true, true, false, false, false], left: 0 });
});

test("S5 single, a set of two, then singles to the end: no remainder", () => {
  const b = builder().add(PRIEST).add(GOLEM).add(MUD).join(2).add(TRAPPER).add(TRAPPER);
  assert.deepEqual(b.s.kills, [{ row: 3, n: 1 }, { row: 0, n: 1, set: 0 }, { row: 2, n: 1, set: 0 }, { row: 1, n: 2 }]);
  checkShape(b.s, { units: [T(3, 0), S(0, 1), S(2, 1), T(1, 2), T(1, 3)], ordered: [true, true, true, true, true], left: 0 });
  // Skip the rest has nothing to skip once the list covers the camp.
  checkShape(b.leave(true).s, { units: [T(3, 0), S(0, 1), S(2, 1), T(1, 2), T(1, 3)], ordered: [true, true, true, true, true], left: 0 });
});

test("S6 two Trappers as singles, joined into one set, split again", () => {
  const b = builder().add(TRAPPER).add(TRAPPER);
  assert.deepEqual(b.s.kills, [{ row: 1, n: 2 }]);
  checkShape(b.s, { units: [T(1, 0), T(1, 1), S(0, 2), S(2, 2), S(3, 2)], ordered: [true, true, false, false, false], left: 0 });
  b.join(1);
  assert.deepEqual(b.s.kills, [{ row: 1, n: 2, set: 0 }]);
  checkShape(b.s, { units: [S(1, 0), S(1, 0), S(0, 1), S(2, 1), S(3, 1)], ordered: [true, true, false, false, false], left: 0 });
  b.split(0);
  assert.deepEqual(b.s.kills, [{ row: 1, n: 2 }]);
  checkShape(b.s, { units: [T(1, 0), T(1, 1), S(0, 2), S(2, 2), S(3, 2)], ordered: [true, true, false, false, false], left: 0 });
});

test("S7 no kills: the whole camp as one set, Skip the rest has no effect", () => {
  const whole = { units: [S(0, 0), S(1, 0), S(1, 0), S(2, 0), S(3, 0)], ordered: [false, false, false, false, false], left: 0 };
  checkShape(builder().s, whole);
  checkShape(builder().leave(true).s, whole);
  // Clear from a built shape returns to the same state.
  assert.deepEqual(builder().add(PRIEST).leave(true).clear().s, { kills: [], leaveRest: false });
});

test("S8 removing a kill from a two-member set leaves a single", () => {
  const b = builder().add(PRIEST).add(GOLEM).join(1).remove(1);
  assert.deepEqual(b.s.kills, [{ row: 3, n: 1 }]);
  checkShape(b.s, { units: [T(3, 0), S(0, 1), S(1, 1), S(1, 1), S(2, 1)], ordered: [true, false, false, false, false], left: 0 });
  const c = builder().add(PRIEST).add(GOLEM).join(1).remove(0);
  assert.deepEqual(c.s.kills, [{ row: 0, n: 1 }]);
  // A set of the n: 2 Trapper entry loses one member.
  const t = builder().add(TRAPPER).add(TRAPPER).join(1).remove(0);
  assert.deepEqual(t.s.kills, [{ row: 1, n: 1 }]);
});

test("S9 join on the first unit, or on a set member, changes nothing", () => {
  const b = builder().add(PRIEST).add(GOLEM);
  const before = b.s.kills;
  assert.doesNotThrow(() => b.join(0));
  assert.deepEqual(b.s.kills, before);
  b.join(1);
  const set = b.s.kills;
  assert.deepEqual(b.join(1).s.kills, set);
  assert.deepEqual(joinWithPrevious([], 0), []);
  assert.equal(killsProblem(b.s.kills, COUNTS), null);
});

test("joining a single after a set adds it to that set", () => {
  const b = builder().add(PRIEST).add(GOLEM).join(1).add(MUD).join(2);
  assert.deepEqual(b.s.kills, [{ row: 3, n: 1, set: 0 }, { row: 0, n: 1, set: 0 }, { row: 2, n: 1, set: 0 }]);
  checkShape(b.s, { units: [S(3, 0), S(0, 0), S(2, 0), S(1, 1), S(1, 1)], ordered: [true, true, true, false, false], left: 0 });
});

test("killsProblem rejects a set split into two runs and n above the row count", () => {
  assert.equal(killsProblem([{ row: 0, n: 1, set: 0 }, { row: 2, n: 1 }, { row: 3, n: 1, set: 0 }], COUNTS), "A set's kills must be next to each other");
  assert.equal(killsProblem([{ row: 0, n: 1, set: 0 }, { row: 2, n: 1, set: 1 }, { row: 3, n: 1, set: 0 }], COUNTS), "A set's kills must be next to each other");
  assert.equal(killsProblem([{ row: 1, n: 3 }], COUNTS), "More kills than creeps in this camp");
  assert.equal(killsProblem([{ row: 1, n: 1 }, { row: 1, n: 2, set: 0 }], COUNTS), "More kills than creeps in this camp");
  assert.equal(schema.safeParse(payload({ kills: [{ row: 1, n: 3 }] })).success, false);
  assert.equal(schema.safeParse(payload({ kills: [{ row: 0, n: 1, set: 0 }, { row: 2, n: 1 }, { row: 3, n: 1, set: 0 }] })).success, false);
});
