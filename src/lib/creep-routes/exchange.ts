import { z } from "zod";
import { BUILD_RACES } from "@/lib/builds/types";
import { ROUTE_LEVELS } from "./types";

/**
 * The seam a future overlay/replay import will use to hand a creep route to
 * the submit form: `/learn/creep-routes/submit#route=<base64url JSON>`, the
 * fragment never reaches the server or its logs. Mirrors
 * `src/lib/builds/exchange.ts`'s `#build=` pattern exactly, one format
 * (`wc3gym-creep-route`), a bare route object accepted too. Nothing writes
 * this export today — F005 only ships the reader — a later feature is
 * expected to add the writer (the overlay's "Submit to site" button, or a
 * replay-derived route).
 */

const raceIds = BUILD_RACES.map((r) => r.id) as [string, ...string[]];
const levelIds = ROUTE_LEVELS.map((l) => l.id) as [string, ...string[]];

export { EXCHANGE_FORMAT, IMPORT_HASH_KEY, encodeForHash, decodeFromHash } from "./exchange-codec.mjs";
import { EXCHANGE_FORMAT } from "./exchange-codec.mjs";

const unitSchema = z.object({
  icon: z.string(),
  count: z.number(),
});

const stopSchema = z.object({
  campId: z.string().nullable().default(null),
  action: z.string().optional(),
  units: z.array(unitSchema).optional(),
  note: z.string().optional(),
  condition: z.string().optional(),
});

export const creepRouteExchangeSchema = z.object({
  title: z.string().default(""),
  map: z.string().default(""),
  race: z.enum(raceIds).optional(),
  vsRaces: z.array(z.enum(raceIds)).default([]),
  level: z.enum(levelIds).default("standard"),
  /** Index into the chosen map's `starts` — which spawn is *your* base;
   *  omitted means the first start (0). */
  /** `nullish`, not `optional`: a producer that serialises an unset field as
   *  `null` (Sanity does) would otherwise fail the whole payload, and the
   *  form silently ignores a payload it cannot parse. Normalised back to
   *  `undefined` so consumers see one shape. */
  start: z
    .number()
    .int()
    .min(0)
    .nullish()
    .transform((v) => v ?? undefined),
  hero: z.string().optional(),
  build: z.string().optional(),
  patch: z.string().optional(),
  tags: z.array(z.string()).default([]),
  summary: z.string().default(""),
  author: z.string().default(""),
  authorDiscord: z.string().optional(),
  sourceUrl: z.string().optional(),
  /** Slug of the route this payload is an update to. Set by the "Suggest an
   *  update" link on a route page so the submit form arrives prefilled *and*
   *  already naming what it replaces. A plain import (replay, overlay) omits
   *  it, because that is a new route rather than an edit. */
  supersedes: z.string().optional(),
  stops: z.array(stopSchema).min(1),
  description: z.string().optional(),
});

export type ExchangeCreepRoute = z.infer<typeof creepRouteExchangeSchema>;

const single = z.object({ format: z.literal(EXCHANGE_FORMAT), route: creepRouteExchangeSchema });

export type ParseResult = { ok: true; route: ExchangeCreepRoute } | { ok: false; error: string };

/** Parses exported JSON text into one route, never throws. */
export function parseExchange(json: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: "That is not valid JSON." };
  }
  const s = single.safeParse(raw);
  if (s.success) return { ok: true, route: s.data.route };
  const bare = creepRouteExchangeSchema.safeParse(raw);
  if (bare.success) return { ok: true, route: bare.data };
  const first = s.error.issues[0] ?? bare.error.issues[0];
  return {
    ok: false,
    error: `This does not look like a creep route export${first ? ` (${first.path.join(".") || "root"}: ${first.message})` : ""}.`,
  };
}


