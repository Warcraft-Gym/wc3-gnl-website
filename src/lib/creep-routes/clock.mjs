/**
 * The in-game day/night clock. The game clock starts at 12:00 (noon) when
 * real time is 0:00; 20 real seconds pass per game hour, so a full 24-hour
 * game day is 480 real seconds (8 minutes). Night runs 18:00-05:59 game
 * time, i.e. real seconds [120, 360) modulo the 480 s cycle.
 *
 * Plain JavaScript (no TypeScript syntax) so `node --test` runs the tests
 * with no loader; `.ts` modules import this file directly (see how
 * `src/lib/w3c.ts` imports `w3c-vs-race.mjs`).
 */

const SECONDS_PER_GAME_HOUR = 20;
const GAME_HOURS_PER_DAY = 24;
const CYCLE_SECONDS = SECONDS_PER_GAME_HOUR * GAME_HOURS_PER_DAY; // 480
const NIGHT_START_SECONDS = 120; // 18:00 game time
const NIGHT_END_SECONDS = 360; // 06:00 game time

/** "m:ss" (any number of minute digits) → seconds. Local copy of
 *  `src/lib/builds/types.ts`'s `parseClock`, kept here so this module stays
 *  plain JS; the two must keep producing the same output. */
export function parseClock(time) {
  const m = String(time).match(/^(\d+):(\d{2})$/);
  if (!m) throw new Error(`not a m:ss clock: ${time}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

/** seconds → "m:ss". Local copy of `src/lib/builds/types.ts`'s `formatClock`. */
export function formatClock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function toRealSeconds(realSecondsOrClock) {
  return typeof realSecondsOrClock === "number" ? realSecondsOrClock : parseClock(realSecondsOrClock);
}

/** Real seconds (or a "m:ss" real clock) → the day clock ("HH:MM", 24-hour,
 *  wraps every 480 real seconds). */
export function toDayClock(realSecondsOrClock) {
  const realSeconds = toRealSeconds(realSecondsOrClock);
  const gameHours = (12 + realSeconds / SECONDS_PER_GAME_HOUR) % GAME_HOURS_PER_DAY;
  let hh = Math.floor(gameHours);
  let mm = Math.round((gameHours - hh) * 60);
  if (mm === 60) {
    mm = 0;
    hh = (hh + 1) % GAME_HOURS_PER_DAY;
  }
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Day clock ("HH:MM") → the real "m:ss" clock of its first occurrence from
 *  game start (real 0:00 = day clock 12:00). */
export function fromDayClock(dayClock) {
  const m = String(dayClock).match(/^(\d{1,2}):(\d{2})$/);
  if (!m) throw new Error(`not a HH:MM day clock: ${dayClock}`);
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const gameHours = ((hh + mm / 60 - 12) % GAME_HOURS_PER_DAY + GAME_HOURS_PER_DAY) % GAME_HOURS_PER_DAY;
  const realSeconds = Math.round(gameHours * SECONDS_PER_GAME_HOUR);
  return formatClock(realSeconds);
}

/** Accepts either a real "m:ss" clock or a day clock "HH:MM" and returns
 *  real seconds. Disambiguation: a value whose first (hour/minute) field is
 *  >= 12, or which is written with a leading zero (e.g. "06:00"), is a day
 *  clock; anything else (e.g. "1:30", "9:45") is a real m:ss clock. This
 *  matches how routes are authored: nobody creeps for 12+ real minutes in
 *  one stop, and a real clock's minutes field is never zero-padded. */
export function parseAnyClock(value) {
  const str = String(value);
  const m = str.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) throw new Error(`not a clock: ${value}`);
  const head = m[1];
  const hh = Number(head);
  const mm = Number(m[2]);
  const looksLikeDayClock = hh >= 12 || (head.length === 2 && head.startsWith("0"));
  if (looksLikeDayClock) {
    const gameHours = ((hh + mm / 60 - 12) % GAME_HOURS_PER_DAY + GAME_HOURS_PER_DAY) % GAME_HOURS_PER_DAY;
    return Math.round(gameHours * SECONDS_PER_GAME_HOUR);
  }
  return hh * 60 + mm;
}

/** True for real seconds falling in game time [18:00, 06:00), i.e. real
 *  [120, 360) modulo the 480 s day/night cycle. */
export function isNight(realSeconds) {
  const cyclePos = ((realSeconds % CYCLE_SECONDS) + CYCLE_SECONDS) % CYCLE_SECONDS;
  return cyclePos >= NIGHT_START_SECONDS && cyclePos < NIGHT_END_SECONDS;
}
