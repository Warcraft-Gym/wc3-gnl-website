import { test } from "node:test";
import assert from "node:assert/strict";
import { formatNextEvent, isPast } from "./next-event.mjs";

const timeIn = (iso, label) => formatNextEvent(iso).times.find((t) => t.label === label).time;

test("renders the day in the zone the event is anchored to", () => {
  // 19:00 UTC on 3 Jan is 2 PM in New York, still the 3rd.
  assert.equal(formatNextEvent("2026-01-03T19:00:00.000Z").day, "Saturday, 3 January 2026");
});

test("winter: 2 PM Eastern is 8 PM in central Europe", () => {
  const iso = "2026-01-03T19:00:00.000Z";
  assert.equal(timeIn(iso, "US Eastern"), "2:00 pm");
  assert.equal(timeIn(iso, "Central Europe"), "8:00 pm");
});

test("summer: both zones have shifted, so the pairing still reads 2 PM / 8 PM", () => {
  const iso = "2026-07-04T18:00:00.000Z";
  assert.equal(timeIn(iso, "US Eastern"), "2:00 pm");
  assert.equal(timeIn(iso, "Central Europe"), "8:00 pm");
});

test("the spring gap: America has sprung forward and Europe has not, so it is 2 PM / 7 PM", () => {
  // 15 March 2026 — after the US change (8 March), before the EU one (29 March).
  // This fortnight is exactly what a hand-maintained "2 PM EST / 8 PM CET"
  // string gets wrong, and why the date is stored as one instant.
  const iso = "2026-03-15T18:00:00.000Z";
  assert.equal(timeIn(iso, "US Eastern"), "2:00 pm");
  assert.equal(timeIn(iso, "Central Europe"), "7:00 pm", "five hours apart here, not six");
});

test("a date crossing midnight in Europe still names the American day", () => {
  // 11 PM Eastern on the 3rd is 5 AM on the 4th in Berlin.
  const out = formatNextEvent("2026-01-04T04:00:00.000Z");
  assert.equal(out.day, "Saturday, 3 January 2026");
  assert.equal(out.times.find((t) => t.label === "Central Europe").time, "5:00 am");
});

test("an unusable date is null rather than 'Invalid Date'", () => {
  for (const bad of ["", "soon", "not-a-date", undefined]) {
    assert.equal(formatNextEvent(bad), null, JSON.stringify(bad));
  }
});

test("isPast keeps a stale event from being advertised as next", () => {
  assert.equal(isPast("2020-01-01T00:00:00Z", new Date("2026-09-25T00:00:00Z")), true);
  assert.equal(isPast("2030-01-01T00:00:00Z", new Date("2026-09-25T00:00:00Z")), false);
  assert.equal(isPast("nonsense"), false, "an unparseable date is not 'past' — the page decides separately");
});
