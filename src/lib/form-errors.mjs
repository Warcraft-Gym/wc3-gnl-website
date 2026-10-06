/**
 * The submit forms' messages that no field shows. A form marks each message
 * under its field, but a check can name a field the form has no spot for (a
 * hero icon from an imported route, a stop's camp that left the map), and
 * "Please fix the highlighted fields" with nothing highlighted is a dead end.
 * Those messages go in the alert by the submit button instead, each named by
 * where it is. Plain JS so `node --test` runs `form-errors.test.mjs` with no
 * loader.
 */

import { numberStops } from "./creep-routes/stop-numbers.mjs";

/** What a field is called on the forms, by its key's last segment. */
const FIELD_LABELS = {
  map: "Map",
  race: "Your race",
  vsRaces: "Against",
  level: "Level",
  start: "Your start",
  hero: "Hero",
  build: "Companion build",
  difficulty: "Difficulty",
  title: "Title",
  summary: "Summary",
  patch: "Patch",
  tags: "Tags",
  description: "Notes",
  author: "Your name",
  authorDiscord: "Discord handle",
  sourceUrl: "Source link",
  videoUrl: "Video",
  supersedes: "Updating an existing build",
  steps: "Steps",
  stops: "Stops",
  time: "Time",
  supply: "Food",
  icon: "Icon",
  instruction: "Instruction",
  campId: "Camp",
  action: "What happens",
  units: "Bring",
  note: "Note",
  condition: "Condition",
  kills: "Kill order",
  leaveRest: "Kill order",
  place: "Place",
  label: "When to take it",
};

const fieldLabel = (segment) => FIELD_LABELS[segment] ?? segment;

/** A key's list position ("stops.3.note" is 3), so stops and steps read top to bottom; -1 for a field. */
const position = (key) => Number(key.match(/^(?:stops|steps)\.(\d+)/)?.[1] ?? -1);

/**
 * `"<where>: <message>"` for each message whose key `isShown` rejects: the
 * route or build's own fields in the check's order, then the stops or steps
 * top to bottom (the check reports a camp that left the map after every
 * other stop message). `where(key)` names the place; an empty name (the
 * "form" key) leaves the message alone.
 * @param {Record<string, string>} fields
 * @param {(key: string) => boolean} isShown
 * @param {(key: string) => string} where
 * @returns {string[]}
 */
export function unshownErrors(fields, isShown, where) {
  return Object.entries(fields)
    .filter(([key]) => !isShown(key))
    .sort(([a], [b]) => position(a) - position(b))
    .map(([key, message]) => {
      const place = where(key);
      return place ? `${place}: ${message}` : message;
    });
}

/** Where a build form message sits: "Step 2, Food", or the field's name. */
export function buildErrorPlace(key) {
  if (key === "form") return "";
  const step = key.match(/^steps\.(\d+)\.(\w+)/);
  if (step) return `Step ${Number(step[1]) + 1}, ${fieldLabel(step[2])}`;
  return fieldLabel(key.split(".")[0]);
}

/** The build form's fields that show their own message. */
export const BUILD_SHOWN =
  /^(title|race|vsRaces|difficulty|patch|tags|summary|description|author|authorDiscord|sourceUrl|videoUrl|supersedes|steps|steps\.\d+\.(time|instruction))$/;

/** The route form's fields that show their own message: the setup's map and race, the details, the
 *  stop list, and a stop's action and kill order, a split and a path's label or emptiness, in a path too. */
export const ROUTE_SHOWN = new RegExp(
  "^(map|race|title|summary|patch|tags|description|author|authorDiscord|sourceUrl|videoUrl|supersedes|stops" +
    "|stops\\.\\d+(\\.split\\.arms\\.\\d+\\.stops\\.\\d+)?\\.(action|kills)" +
    "|stops\\.\\d+\\.split(\\.arms\\.\\d+\\.(label|stops))?)$",
);

/** A stop as the route list numbers it ("Stop 3", "Stop 4a"); a waypoint has no number. */
const stopName = (label) => (label ? `Stop ${label}` : "A waypoint");

/**
 * Where a route form message sits, named the way the route list numbers its
 * stops: "Stop 3, Note", "Stop 4a, Camp", "Paths at stop 2, path B". A path is
 * named as its tab or heading names it: A, B, C to choose one, 1, 2, 3 to take all.
 * `stops` is the list that was checked, so the numbers match the message's indexes.
 * @param {string} key
 * @param {{ split?: { mode: string, arms: { stops: unknown[] }[] } }[]} stops
 */
export function routeErrorPlace(key, stops) {
  if (key === "form") return "";
  const m = key.match(/^stops\.(\d+)(\.split(?:\.arms\.(\d+)(?:\.stops\.(\d+))?)?)?(?:\.(\w+))?/);
  if (!m) return fieldLabel(key.split(".")[0]);
  const [, i, split, arm, j, field] = m;
  const entry = numberStops(stops)[Number(i)];
  if (!entry) return fieldLabel("stops");
  const armEntry = arm === undefined ? undefined : entry.arms?.[Number(arm)];
  const place =
    j !== undefined
      ? stopName(armEntry?.stops[Number(j)]?.label)
      : split
        ? `Paths at stop ${entry.label}${armEntry ? `, path ${stops[Number(i)].split?.mode === "and" ? Number(arm) + 1 : armEntry.letter.toUpperCase()}` : ""}`
        : stopName(entry.label);
  return field ? `${place}, ${fieldLabel(field)}` : place;
}
