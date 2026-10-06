/**
 * The size caps of a route (v2.7): 3 paths per split, one level of splits, 12 numbered stops (the
 * highest number any reading reaches, `longestCount`) and 20 rows. A row is one entry of the stop
 * list: a stop, a waypoint or a split, a path's stops included. The builder's add actions do nothing at a cap and say so (`addBlocked`); the submit
 * check and the Studio (as warnings) repeat it past a cap (`capProblems`). Takes the route's
 * split nodes (`split.arms`), the builder's rows (same shape) and Sanity's `creepSplit` members
 * (`arms` on the item). A stop takes at most 3 pictures of at most 5 MB each (the Studio's checks;
 * the reader shows the first 3). Plain JS so `node --test` runs `caps.test.mjs`.
 */
import { longestCount } from "./stop-numbers.mjs";

export const MAX_PATHS = 3;
export const MAX_STOPS = 12;
export const MAX_ROWS = 20;
export const MAX_STOP_IMAGES = 3;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ASK = "Ask on Discord if you need more.";

/** The line the builder shows at a cap. */
export const CAP_AT = {
  stops: `This route is at the cap of ${MAX_STOPS} numbered stops. ${ASK}`,
  rows: `This route is at the cap of ${MAX_ROWS} rows. ${ASK}`,
  paths: `At most ${MAX_PATHS} paths here. ${ASK}`,
};

/** The same line when a route is past a cap (the submit check, the Studio). */
export const CAP_OVER = {
  stops: `This route is over the cap of ${MAX_STOPS} numbered stops. ${ASK}`,
  rows: `This route is over the cap of ${MAX_ROWS} rows. ${ASK}`,
  paths: `More than ${MAX_PATHS} paths here. ${ASK}`,
  images: `This stop is over the cap of ${MAX_STOP_IMAGES} pictures. ${ASK}`,
  imageBytes: `This picture is over the cap of ${MAX_IMAGE_BYTES / 1024 / 1024} MB. Save the screenshot as JPEG and upload it again.`,
};

const armsOf = (s) => s?.split?.arms ?? (s?._type === "creepSplit" ? (s.arms ?? []) : null);

/** Rows in the stop list: every stop, waypoint and split, the paths' stops included. */
export function rowCount(stops) {
  return (stops ?? []).reduce((n, s) => n + 1 + (armsOf(s) ?? []).reduce((m, arm) => m + (arm.stops?.length ?? 0), 0), 0);
}

/** The cap line an add would pass, or null when it fits. `add`: "stop" (a numbered stop: a camp or an
 *  attack), "row" (a waypoint or a split) or "path" (with `split`, the split it goes into). */
export function addBlocked(stops, add, split) {
  if (add === "path") return (armsOf(split)?.length ?? 0) >= MAX_PATHS ? CAP_AT.paths : null;
  if (rowCount(stops) >= MAX_ROWS) return CAP_AT.rows;
  if (add === "stop" && longestCount(stops) >= MAX_STOPS) return CAP_AT.stops;
  return null;
}

/** The route's problems past a cap: `{ path, message }`, `path` relative to the stop list. */
export function capProblems(stops) {
  const out = [];
  if (longestCount(stops) > MAX_STOPS) out.push({ path: [], message: CAP_OVER.stops });
  if (rowCount(stops) > MAX_ROWS) out.push({ path: [], message: CAP_OVER.rows });
  (stops ?? []).forEach((s, i) => {
    if ((armsOf(s)?.length ?? 0) > MAX_PATHS) out.push({ path: [i], message: CAP_OVER.paths });
  });
  return out;
}
