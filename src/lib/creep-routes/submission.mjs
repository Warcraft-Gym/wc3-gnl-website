import { z } from "zod";
import { isEmbeddable } from "../video-embed.mjs";
import { isKnownPatch } from "../patches.mjs";
import { killsProblem } from "./kills.mjs";
import { placeProblem } from "./place.mjs";
import { countStops } from "./stop-numbers.mjs";
import { CAP_OVER, MAX_PATHS, capProblems } from "./caps.mjs";

/**
 * Validation + draft-shaping for public creep-route submissions. Plain JS
 * (no TypeScript syntax) so `node --test` runs `submission.test.mjs` with
 * no loader, same reason `derive.mjs` stays plain JS. The known ids a
 * submission is checked against (map slugs + their camp ids, icon keys,
 * build slugs) are never imported here — importing a `.ts` module from a
 * `.mjs` one needs Node's type-stripping flag, which the plain `node
 * --test` invocation in package.json doesn't pass — so the schema is a
 * factory, `createSubmissionSchema(catalogue)`, and the caller (the server
 * action) passes in the live catalogue read from `maps.ts`/`icons.ts`/
 * `builds.ts`. `submission.test.mjs` passes a small fake one.
 *
 * Race and level ids are duplicated here so they keep matching
 * `BUILD_RACES`' and `ROUTE_LEVELS`' own ids (src/lib/builds/types.ts,
 * src/lib/creep-routes/types.ts).
 */

/** Per-stop free-text limits. Exported so the editor's inputs and the
 *  Sanity schema cap at exactly what the validator accepts, instead of three
 *  copies of a magic number drifting apart — a stop note is the one place
 *  authors write real prose ("pull the ogre with the hero, let the wolves
 *  reset, then finish"), so it gets room. */
export const STOP_NOTE_MAX = 600;
export const STOP_CONDITION_MAX = 120;

const RACE_IDS = ["human", "orc", "nightelf", "undead"];
/** A Sanity array `_key`: letters, digits, `_` and `-`. */
const STOP_KEY = /^[A-Za-z0-9_-]{1,64}$/;
const ROUTE_LEVEL_IDS = ["standard", "beginner"];

/** Field-level messages keyed by path ("title", "stops.2.action"). */
export function flattenErrors(err) {
  const out = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function unitSchema(iconSet) {
  return z.object({
    icon: z
      .string()
      .trim()
      .min(1, "Pick an icon")
      .refine((v) => iconSet.has(v), "Unknown icon"),
    count: z.number().int().min(1, "At least 1").max(20, "Max 20"),
  });
}

function baseStopSchema(iconSet, splitField) {
  return z
    .object({
      /** null marks a base action (TP home, buy from a shop, take the
       *  expansion); a camp stop names the camp id instead. Camp contents
       *  are never authored here, only looked up by id against the map. */
      campId: z.string().trim().min(1).nullable(),
      /** The `_key` of the published stop this one updates; the server copies that stop's pictures. */
      key: z.string().regex(STOP_KEY, "Invalid stop key").optional(),
      action: z.string().trim().max(60, "Max 60 characters").optional(),
      units: z.array(unitSchema(iconSet)).max(6, "Up to 6").optional(),
      note: z.string().trim().max(STOP_NOTE_MAX, `Max ${STOP_NOTE_MAX} characters`).optional(),
      condition: z
        .string()
        .trim()
        .max(STOP_CONDITION_MAX, `Max ${STOP_CONDITION_MAX} characters`)
        .optional(),
      /** Kill order, see `kills.mjs`. Row bounds are checked against the
       *  map's camps in the submission's `superRefine`. */
      kills: z
        .array(z.object({ row: z.number().int().min(0), n: z.number().int().min(1).max(20), set: z.number().int().min(0).max(99).optional() }))
        .max(20, "Up to 20 kills")
        .optional(),
      /** True skips the creeps `kills` does not list ("Skip the rest"). */
      leaveRest: z.boolean().optional(),
      /** A start, mine, shop or free point instead of a camp, see `place.mjs`. */
      place: placeSchema.optional(),
      /** Camp and attack stops: false when only the Bring units go (the hero still earns their XP); on a
       *  waypoint, false makes it a pin (`isPin`): the line skips it. */
      hero: z.boolean().optional(),
      /** A split at the top level; inside an arm it is rejected (one level). */
      split: splitField,
    })
    .superRefine((stop, ctx) => {
      if (stop.split) {
        // A node is `campId: null` and its ways; any other field would be dropped from the draft.
        const extra = ["action", "place", "hero", "note", "condition", "units", "kills", "leaveRest"].filter(
          (k) => stop[k] !== undefined && !(Array.isArray(stop[k]) && !stop[k].length),
        );
        if (stop.campId !== null || extra.length) {
          ctx.addIssue({ code: "custom", message: "Paths hold only stops.", path: ["split"] });
        }
        return;
      }
      if (stop.hero === false && stop.campId === null && !stop.place) {
        ctx.addIssue({ code: "custom", message: "Only a camp, attack or waypoint stop can go without the hero", path: ["hero"] });
      }
      if (stop.place && stop.campId !== null) {
        ctx.addIssue({ code: "custom", message: "A place stop has no camp", path: ["place"] });
      } else if (stop.campId === null && !stop.action) {
        ctx.addIssue({
          code: "custom",
          message: stop.place ? "Say what happens here" : 'Name the base action, e.g. "TP home"',
          path: ["action"],
        });
      }
    });
}

/** A split's ways: 2 or 3 arms of up to 20 stops (an empty one is named). "or" and "xor" label every way with its condition
 *  (the tab text); "and" takes no labels (each stop's Bring says who goes). */
function splitSchema(armStopSchema) {
  return z
    .object({
      mode: z.enum(["and", "or", "xor"], { error: "Pick how the paths run" }),
      arms: z
        .array(
          z.object({
            label: z.string().trim().max(60, "Max 60 characters").optional(),
            stops: z.array(armStopSchema).max(20, "Max 20 stops"),
          }),
        )
        .min(2, "Add a second path or remove the paths.")
        .max(MAX_PATHS, CAP_OVER.paths),
    })
    .superRefine((split, ctx) => {
      // The builder leaves a path empty when its last stop moves out; the check names it as its tab or heading does.
      split.arms.forEach((arm, a) => {
        const name = split.mode === "and" ? a + 1 : "ABC"[a];
        if (!arm.stops.length) ctx.addIssue({ code: "custom", message: `Path ${name} is empty. Add a stop to it or remove it.`, path: ["arms", a, "stops"] });
      });
      if (split.mode === "and") return;
      split.arms.forEach((arm, a) => {
        if (!arm.label) ctx.addIssue({ code: "custom", message: "Say when to take this path", path: ["arms", a, "label"] });
      });
    });
}

const placeSchema = z.object({
  kind: z.enum(["attack", "build", "expand", "shop", "scout"], { error: "Pick what happens here" }),
  at: z.union([
    z.object({ start: z.string().trim().min(1).max(20) }).strict(),
    z.object({ mine: z.string().trim().min(1).max(20) }).strict(),
    z.object({ shop: z.string().trim().min(1).max(40) }).strict(),
    z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).strict(),
  ]),
});

/**
 * Builds the zod schema for one submission against a live catalogue:
 * `maps`: `{ slug, campIds }[]` (every catalogue map and its real camp
 * ids, so a stop can only reference a camp that actually exists there),
 * `iconKeys`: every valid `GAME_ICON_OPTIONS` key (hero + bring icons),
 * `buildSlugs`: known build-order slugs for the optional companion link
 * (an empty/omitted list skips that check, so tests don't need the whole
 * build catalogue).
 */
export function createSubmissionSchema({ maps, iconKeys, buildSlugs = [] }) {
  if (!maps || !maps.length) throw new Error("createSubmissionSchema needs at least one map");
  const mapSlugs = maps.map((m) => m.slug);
  const campsByMap = new Map(maps.map((m) => [m.slug, new Set(m.campIds)]));
  // `creepCounts` (camp id → each creep row's count) is optional like
  // `startsCount`; the kill-order check only runs when it is known.
  const creepCountsByMap = new Map(maps.map((m) => [m.slug, m.creepCounts]));
  // `startsCount` is optional on each catalogue entry (callers that don't
  // care about the start-index bound, like a handful of pre-existing
  // tests, can omit it); the check below only runs when it's known.
  const startsCountByMap = new Map(maps.map((m) => [m.slug, m.startsCount]));
  // `startIds`, `mineCount`, `shopIds` are optional too; `placeProblem` skips an unknown list.
  const placeIdsByMap = new Map(maps.map((m) => [m.slug, { startIds: m.startIds, mineCount: m.mineCount, shopIds: m.shopIds }]));
  const iconSet = new Set(iconKeys ?? []);
  const buildSet = new Set(buildSlugs);
  const noSplit = z.unknown().optional().refine((v) => v === undefined, "A path cannot hold more paths");
  const armStopSchema = baseStopSchema(iconSet, noSplit);
  const stopSchema = baseStopSchema(iconSet, splitSchema(armStopSchema).optional());

  return z
    .object({
      map: z.enum(mapSlugs, { error: "Pick a map" }),
      race: z.enum(RACE_IDS, { error: "Pick your race" }),
      vsRaces: z
        .array(z.enum(RACE_IDS))
        .max(4)
        .transform((v) => [...new Set(v)]),
      level: z.enum(ROUTE_LEVEL_IDS, { error: "Pick a level" }),
      /** Index into the chosen map's `starts` — which spawn is *your* base.
       *  0 (the default, every two-start map) doesn't need to be sent at
       *  all; only a >2-start map's picker sends something else. */
      start: z.coerce.number().int().min(0).optional(),
      hero: z
        .string()
        .trim()
        .max(60)
        .optional()
        .refine((v) => !v || iconSet.has(v), "Unknown hero icon"),
      build: z
        .string()
        .trim()
        .max(120)
        .optional()
        .refine((v) => !v || !buildSet.size || buildSet.has(v), "Unknown build"),
      /** A YouTube or Vimeo link showing the route played out. Validated as
       *  embeddable at submit time so an author is told now, rather than
       *  finding a bare link on the page later. Kept separate from
       *  `sourceUrl`, which credits a replay or post and stays a link. */
      videoUrl: z
        .string()
        .trim()
        .max(300)
        .optional()
        .refine((v) => !v || isEmbeddable(v), "Paste a YouTube or Vimeo link"),
      /** An author updating their own route resubmits it and names the one
       *  it replaces — the site has no accounts, so there is nobody to
       *  authenticate an in-place edit against. A coach approves the new
       *  version and archives the old, which is also the moment the change
       *  gets reviewed. Accepts a bare slug or the full page URL. */
      supersedes: z
        .string()
        .trim()
        .max(300)
        .optional()
        .transform((v) => (v ? slugFromInput(v) : undefined)),
      title: z.string().trim().min(6, "Give it a proper title").max(90, "Max 90 characters"),
      summary: z.string().trim().min(20, "A sentence or two, at least 20 characters").max(200, "Max 200 characters"),
      author: z.string().trim().min(2, "Who should we credit?").max(60, "Max 60 characters"),
      authorDiscord: z.string().trim().max(60, "Max 60 characters").optional(),
      sourceUrl: z
        .string()
        .trim()
        .max(300)
        .optional()
        .refine((v) => !v || /^https?:\/\//.test(v), "Must start with http(s)://"),
      patch: z
        .string()
        .trim()
        .optional()
        .transform((v) => v || undefined)
        .refine((v) => isKnownPatch(v), "Pick a patch from the list"),
      tags: z
        .string()
        .trim()
        .max(200)
        .optional()
        .transform((v) =>
          (v ?? "")
            .split(",")
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean)
            .slice(0, 8),
        ),
      description: z.string().trim().max(6000, "Max 6000 characters").optional(),
      // Two stops at least, counted with every way's stops (`countStops`): a whole-route pair is one split.
      stops: z.array(stopSchema).min(1, "Add at least two stops").max(30, "Max 30 stops"),
      /** Honeypot: a real submitter never fills this (it's visually hidden,
       *  `tabIndex={-1}`). Accepted as *any* string here — rejecting a
       *  nonempty value at the schema level (the old `z.string().max(0)`)
       *  made the honeypot check at the bottom of `submitCreepRoute` dead
       *  code (a filled field always failed `parsed.success` first, well
       *  before that line could ever run) and surfaced a generic "fix the
       *  highlighted fields" error — the opposite of a silent trap. The
       *  post-parse check in `decideSubmission` below is what actually
       *  reacts to it now (code-a.md, "Should fix"). */
      website: z.string().optional(),
      /** Client timestamp when the form was opened; bots submit instantly. */
      startedAt: z.coerce.number().optional(),
    })
    .superRefine((data, ctx) => {
      if (countStops(data.stops) < 2) ctx.addIssue({ code: "custom", message: "Add at least two stops", path: ["stops"] });
      // The caps (`caps.mjs`): the builder stops at them; an imported route past one is told here.
      for (const { path, message } of capProblems(data.stops)) {
        if (!path.length) ctx.addIssue({ code: "custom", message, path: ["stops"] });
      }
      const campIds = campsByMap.get(data.map);
      const checkStop = (stop, path) => {
        if (stop.campId && campIds && !campIds.has(stop.campId)) {
          ctx.addIssue({
            code: "custom",
            message: `Unknown camp "${stop.campId}" on this map`,
            path: [...path, "campId"],
          });
        }
        const counts = stop.campId && creepCountsByMap.get(data.map)?.[stop.campId];
        const problem = stop.kills?.length
          ? stop.campId ? counts && killsProblem(stop.kills, counts) : "A base action has no creeps"
          : null;
        if (problem) ctx.addIssue({ code: "custom", message: problem, path: [...path, "kills"] });
        const placeIssue = stop.place && placeProblem(stop.place, placeIdsByMap.get(data.map));
        if (placeIssue) ctx.addIssue({ code: "custom", message: placeIssue, path: [...path, "place"] });
      };
      data.stops.forEach((stop, i) => {
        checkStop(stop, ["stops", i]);
        stop.split?.arms.forEach((arm, a) => arm.stops.forEach((s, j) => checkStop(s, ["stops", i, "split", "arms", a, "stops", j])));
        // An "xor" way never rejoins: nothing may follow it.
        if (stop.split?.mode === "xor" && i < data.stops.length - 1) {
          ctx.addIssue({ code: "custom", message: "No stop can follow paths that end the route.", path: ["stops", i, "split"] });
        }
      });
      const startsCount = startsCountByMap.get(data.map);
      if (data.start !== undefined && startsCount !== undefined && data.start >= startsCount) {
        ctx.addIssue({
          code: "custom",
          message: `This map only has ${startsCount} spawn${startsCount === 1 ? "" : "s"}`,
          path: ["start"],
        });
      }
    });
}

/** A `stopsJson` form value larger than this is rejected *before*
 *  `JSON.parse` ever runs — `actions.ts:36` used to parse an unbounded
 *  string straight from the form, with the schema's `stops.max(30)` bound
 *  only kicking in after a full parse succeeded (code-a.md, "Must fix"). */
export const MAX_STOPS_JSON_BYTES = 64 * 1024;

/** True when a raw `stopsJson` form value is too large to even attempt to
 *  parse. Pure and synchronous, checked byte length (not `.length`, which
 *  undercounts multi-byte characters) via `Buffer`, always available under
 *  plain Node — no dependency. */
export function stopsJsonTooLarge(raw) {
  return Buffer.byteLength(raw, "utf8") > MAX_STOPS_JSON_BYTES;
}

/** The two spam guards `submitCreepRoute` runs right after a successful
 *  parse, factored out as a pure decision so they're testable without
 *  mocking `next/headers` or Sanity: a filled honeypot always fakes success
 *  (never reaches `createCreepRouteDraft` — the caller returns on this
 *  branch before that import is ever invoked), a too-fast `startedAt`
 *  rejects with a message, anything else proceeds. `now`/`minFillSeconds`
 *  are injectable for tests; the action passes its own `MIN_FILL_SECONDS`. */
export function decideSubmission(data, { now = Date.now(), minFillSeconds = 8 } = {}) {
  if (data.website) return { action: "fake-ok" };
  if (data.startedAt !== undefined && now - data.startedAt < minFillSeconds * 1000) {
    return { action: "reject", reason: "too-fast" };
  }
  return { action: "proceed" };
}

function shortKey() {
  return crypto.randomUUID().slice(0, 12);
}

/** Plain text → Portable Text: one block per paragraph, blank-line
 *  separated. Local copy of `src/lib/builds/submit.ts`'s helper, kept here
 *  so `toCreepRouteDraft` stays a pure, dependency-free function. */
function toPortableText(text) {
  if (!text) return undefined;
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
  if (!paragraphs.length) return undefined;
  return paragraphs.map((p) => ({
    _type: "block",
    _key: shortKey(),
    style: "normal",
    markDefs: [],
    children: [{ _type: "span", _key: shortKey(), text: p, marks: [] }],
  }));
}

/**
 * A validated submission (the parsed output of `createSubmissionSchema`) →
 * a pending `creepRoute` draft document, in the exact shape `client.create`
 * expects. Pure and synchronous: no network, no Sanity client, so it is
 * directly testable. `mapDocId` and `buildDocId` are resolved by the
 * caller (`submit.ts`, server-only) — this function never talks to Sanity
 * itself.
 */
/** The slug out of whatever an author pastes: a bare slug, a path, or a full
 *  URL with query or hash. Anything that is not slug-shaped is returned
 *  trimmed so validation upstream can reject it by name rather than silently
 *  matching nothing. */
export function slugFromInput(value) {
  const withoutQuery = String(value).split(/[?#]/)[0].replace(/\/+$/, "");
  const last = withoutQuery.split("/").filter(Boolean).pop() ?? "";
  return last.trim();
}

export function toCreepRouteDraft(valid, mapDocId, buildDocId, supersedesDocId) {
  return {
    _id: `drafts.${crypto.randomUUID()}`,
    _type: "creepRoute",
    reviewStatus: "pending",
    title: valid.title,
    race: valid.race,
    vsRaces: valid.vsRaces,
    level: valid.level,
    map: { _type: "reference", _ref: mapDocId },
    start: valid.start || undefined,
    hero: valid.hero || undefined,
    patch: valid.patch || undefined,
    summary: valid.summary,
    author: valid.author,
    authorDiscord: valid.authorDiscord || undefined,
    sourceUrl: valid.sourceUrl || undefined,
    videoUrl: valid.videoUrl || undefined,
    build: buildDocId ? { _type: "reference", _ref: buildDocId } : undefined,
    supersedes: supersedesDocId ? { _type: "reference", _ref: supersedesDocId } : undefined,
    tags: valid.tags,
    featured: false,
    publishedAt: new Date().toISOString(),
    stops: valid.stops.map((s) =>
      s.split
        ? {
            _type: "creepSplit",
            _key: shortKey(),
            mode: s.split.mode,
            arms: s.split.arms.map((arm) => ({
              _type: "arm",
              _key: shortKey(),
              ...(s.split.mode !== "and" && arm.label ? { label: arm.label } : {}),
              stops: arm.stops.map(draftStop),
            })),
          }
        : draftStop(s),
    ),
    description: toPortableText(valid.description),
  };
}

/** One camp, place or base-action stop as a Sanity `stop` array member. */
function draftStop(s) {
  return {
    _type: "stop",
    _key: shortKey(),
    campId: s.campId || undefined,
    action: s.action || undefined,
    units: s.units && s.units.length
      ? s.units.map((u) => ({ _type: "unit", _key: shortKey(), icon: u.icon, count: u.count }))
      : undefined,
    note: s.note || undefined,
    condition: s.condition || undefined,
    kills: s.campId && s.kills?.length
      ? s.kills.map((k) => ({ _type: "kill", _key: shortKey(), row: k.row, n: k.n, ...(k.set !== undefined ? { set: k.set } : {}) }))
      : undefined,
    leaveRest: s.campId && s.kills?.length && s.leaveRest ? true : undefined,
    place: s.place ? { ...s.place } : undefined,
    hero: s.hero === false && (s.campId || s.place) ? false : undefined,
    images: s.images?.length ? s.images : undefined,
  };
}
