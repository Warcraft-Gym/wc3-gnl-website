import { z } from "zod";
import { isEmbeddable } from "../video-embed.mjs";

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

function baseStopSchema(iconSet) {
  return z
    .object({
      /** null marks a base action (TP home, buy from a shop, take the
       *  expansion); a camp stop names the camp id instead. Camp contents
       *  are never authored here, only looked up by id against the map. */
      campId: z.string().trim().min(1).nullable(),
      action: z.string().trim().max(60, "Max 60 characters").optional(),
      units: z.array(unitSchema(iconSet)).max(6, "Up to 6").optional(),
      note: z.string().trim().max(STOP_NOTE_MAX, `Max ${STOP_NOTE_MAX} characters`).optional(),
      condition: z
        .string()
        .trim()
        .max(STOP_CONDITION_MAX, `Max ${STOP_CONDITION_MAX} characters`)
        .optional(),
    })
    .refine((stop) => stop.campId !== null || Boolean(stop.action), {
      message: 'Name the base action, e.g. "TP home"',
      path: ["action"],
    });
}

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
  // `startsCount` is optional on each catalogue entry (callers that don't
  // care about the start-index bound, like a handful of pre-existing
  // tests, can omit it); the check below only runs when it's known.
  const startsCountByMap = new Map(maps.map((m) => [m.slug, m.startsCount]));
  const iconSet = new Set(iconKeys ?? []);
  const buildSet = new Set(buildSlugs);
  const stopSchema = baseStopSchema(iconSet);

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
      patch: z.string().trim().max(16, "Max 16 characters").optional(),
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
      stops: z.array(stopSchema).min(2, "Add at least two stops").max(30, "Max 30 stops"),
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
      const campIds = campsByMap.get(data.map);
      data.stops.forEach((stop, i) => {
        if (stop.campId && campIds && !campIds.has(stop.campId)) {
          ctx.addIssue({
            code: "custom",
            message: `Unknown camp "${stop.campId}" on this map`,
            path: ["stops", i, "campId"],
          });
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
    stops: valid.stops.map((s) => ({
      _type: "stop",
      _key: shortKey(),
      campId: s.campId || undefined,
      action: s.action || undefined,
      units: s.units && s.units.length
        ? s.units.map((u) => ({ _type: "unit", _key: shortKey(), icon: u.icon, count: u.count }))
        : undefined,
      note: s.note || undefined,
      condition: s.condition || undefined,
    })),
    description: toPortableText(valid.description),
  };
}
