import { z } from "zod";

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
      note: z.string().trim().max(160, "Max 160 characters").optional(),
      condition: z.string().trim().max(60, "Max 60 characters").optional(),
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
      /** Honeypot, must stay empty. */
      website: z.string().max(0).optional(),
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
export function toCreepRouteDraft(valid, mapDocId, buildDocId) {
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
    build: buildDocId ? { _type: "reference", _ref: buildDocId } : undefined,
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
