import { test } from "node:test";
import assert from "node:assert/strict";
import { LISTED_ZONES, formatInZone, formatNextEvent, isPast } from "./next-event.mjs";

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

test("the day comes from the anchor zone, not from UTC or from America", () => {
  // 04:00 UTC on the 4th: still the 3rd in New York (11 PM), already the 4th
  // in London and Berlin. The anchor is the UK, so the page says the 4th.
  const out = formatNextEvent("2026-01-04T04:00:00.000Z");
  assert.equal(out.day, "Sunday, 4 January 2026");
  assert.equal(timeIn("2026-01-04T04:00:00.000Z", "US Eastern"), "11:00 pm");
  assert.equal(timeIn("2026-01-04T04:00:00.000Z", "Central Europe"), "5:00 am");
});

test("the evening the user actually asked for: 19:00 UK", () => {
  // 26 September 2026 is British Summer Time, so 19:00 UK is 18:00 UTC.
  const iso = "2026-09-26T18:00:00.000Z";
  assert.equal(formatNextEvent(iso).day, "Saturday, 26 September 2026");
  assert.equal(timeIn(iso, "UK"), "7:00 pm");
  assert.equal(timeIn(iso, "Central Europe"), "8:00 pm");
  assert.equal(timeIn(iso, "US Eastern"), "2:00 pm");
});

test("in winter the UK is on GMT and the same instant reads an hour earlier", () => {
  const iso = "2026-01-03T18:00:00.000Z";
  assert.equal(timeIn(iso, "UK"), "6:00 pm", "GMT, not BST");
  assert.equal(timeIn(iso, "Central Europe"), "7:00 pm");
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

test("formatInZone renders the event as one zone sees it", () => {
  const out = formatInZone("2026-09-26T18:00:00.000Z", "Asia/Tokyo");
  // 18:00 UTC on Saturday is 03:00 Sunday in Tokyo — the day rolls over.
  assert.equal(out.day, "Sunday 27 September", "en-GB omits the comma when there is no year");
  assert.equal(out.time, "3:00 am");
  assert.match(out.zone, /GMT\+9|JST/);
});

test("formatInZone agrees with the fixed list for a listed zone", () => {
  const iso = "2026-09-26T18:00:00.000Z";
  assert.equal(formatInZone(iso, "Europe/London").time, "7:00 pm");
  assert.equal(formatInZone(iso, "America/New_York").time, "2:00 pm");
});

test("formatInZone survives a browser handing over a junk time zone", () => {
  // Intl throws on an unknown IANA name, and this runs during render.
  for (const tz of ["Not/AZone", "", null, undefined, "UTC+3"]) {
    assert.equal(formatInZone("2026-09-26T18:00:00.000Z", tz), null, String(tz));
  }
});

test("formatInZone rejects a bad date as well as a bad zone", () => {
  assert.equal(formatInZone("nonsense", "Europe/London"), null);
});

test("LISTED_ZONES is the zones the page already prints", () => {
  assert.deepEqual(LISTED_ZONES, ["Europe/London", "Europe/Berlin", "America/New_York"]);
});
