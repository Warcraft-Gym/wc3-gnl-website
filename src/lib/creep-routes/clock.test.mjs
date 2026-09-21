import assert from "node:assert/strict";
import test from "node:test";
import { toDayClock, fromDayClock, parseAnyClock, isNight, parseClock, formatClock } from "./clock.mjs";

test("toDayClock: real m:ss -> HH:MM, starting at 12:00 and wrapping every 480s", () => {
  assert.equal(toDayClock("0:00"), "12:00");
  assert.equal(toDayClock("1:00"), "15:00");
  assert.equal(toDayClock("1:30"), "16:30");
  assert.equal(toDayClock("2:00"), "18:00");
  assert.equal(toDayClock("6:00"), "06:00");
  assert.equal(toDayClock("8:00"), "12:00");
});

test("toDayClock accepts real seconds as a number too", () => {
  assert.equal(toDayClock(0), "12:00");
  assert.equal(toDayClock(90), "16:30");
});

test("fromDayClock: HH:MM -> first-occurrence m:ss", () => {
  assert.equal(fromDayClock("16:30"), "1:30");
  assert.equal(fromDayClock("12:00"), "0:00");
  assert.equal(fromDayClock("18:00"), "2:00");
  assert.equal(fromDayClock("06:00"), "6:00");
});

test("parseAnyClock disambiguates real m:ss from day-clock HH:MM", () => {
  assert.equal(parseAnyClock("16:30"), 90);
  assert.equal(parseAnyClock("1:30"), 90);
  assert.equal(parseAnyClock("9:45"), 585);
  assert.equal(parseAnyClock("06:00"), 360);
});

test("isNight: real seconds [120, 360) modulo the 480s cycle are night", () => {
  assert.equal(isNight(120), true);
  assert.equal(isNight(119), false);
  assert.equal(isNight(360), false);
  assert.equal(isNight(600), true);
});

test("isNight covers a second cycle boundary too", () => {
  assert.equal(isNight(479), false); // 23:57, still day
  assert.equal(isNight(480), false); // 12:00 again (start of new day)
  assert.equal(isNight(839), true); // 480 + 359
  assert.equal(isNight(840), false); // 480 + 360
});

test("parseClock / formatClock round-trip m:ss", () => {
  assert.equal(parseClock("1:30"), 90);
  assert.equal(formatClock(90), "1:30");
  assert.equal(formatClock(parseClock("10:05")), "10:05");
});
