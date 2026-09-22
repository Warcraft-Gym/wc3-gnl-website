import { z } from "zod";
import { BUILD_DIFFICULTIES, BUILD_RACES } from "./types";

/**
 * The overlay app's private-build export format (`wc3gym-build`, version 1)
 * and a lenient reader for it, so a build written in the overlay can be
 * dropped into the site's submit form. Mirrors apps/overlay/src/lib/
 * buildExchange.ts; keep the two in step. A bare build object, or the
 * multi-build file (first build wins), is accepted too.
 */

const raceIds = BUILD_RACES.map((r) => r.id) as [string, ...string[]];
const difficultyIds = BUILD_DIFFICULTIES.map((d) => d.id) as [string, ...string[]];

export {
  EXCHANGE_FORMAT_SINGLE,
  EXCHANGE_FORMAT_MULTI,
  IMPORT_HASH_KEY,
  encodeForHash,
  decodeFromHash,
} from "./exchange-codec.mjs";
import { EXCHANGE_FORMAT_SINGLE, EXCHANGE_FORMAT_MULTI } from "./exchange-codec.mjs";

const stepSchema = z.object({
  time: z.string().optional(),
  supply: z.number().optional(),
  instruction: z.string(),
  icon: z.string().optional(),
});

export const exchangeBuildSchema = z.object({
  title: z.string().default(""),
  race: z.enum(raceIds).optional(),
  vsRaces: z.array(z.enum(raceIds)).default([]),
  difficulty: z.enum(difficultyIds).default("beginner"),
  patch: z.string().optional(),
  tags: z.array(z.string()).default([]),
  summary: z.string().default(""),
  author: z.string().default(""),
  authorDiscord: z.string().optional(),
  sourceUrl: z.string().optional(),
  /** Slug of the build this payload updates — set by a build page's
   *  "Suggest an update" link. A replay or overlay import omits it, being a
   *  new build rather than an edit. */
  supersedes: z.string().optional(),
  steps: z.array(stepSchema).min(1),
  description: z.string().optional(),
});

export type ExchangeBuild = z.infer<typeof exchangeBuildSchema>;

const single = z.object({ format: z.literal(EXCHANGE_FORMAT_SINGLE), build: exchangeBuildSchema });
const multi = z.object({ format: z.literal(EXCHANGE_FORMAT_MULTI), builds: z.array(exchangeBuildSchema).min(1) });

export type ParseResult = { ok: true; build: ExchangeBuild } | { ok: false; error: string };

/** Parses exported JSON text into one build, never throws. */
export function parseExchange(json: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: "That is not valid JSON." };
  }
  const s = single.safeParse(raw);
  if (s.success) return { ok: true, build: s.data.build };
  const m = multi.safeParse(raw);
  if (m.success) return { ok: true, build: m.data.builds[0] };
  const bare = exchangeBuildSchema.safeParse(raw);
  if (bare.success) return { ok: true, build: bare.data };
  const first = s.error.issues[0] ?? bare.error.issues[0];
  return {
    ok: false,
    error: `This does not look like a build exported from the overlay${first ? ` (${first.path.join(".") || "root"}: ${first.message})` : ""}.`,
  };
}

