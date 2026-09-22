"use server";

import { headers } from "next/headers";
import {
  createSubmissionSchema,
  decideSubmission,
  flattenErrors,
  stopsJsonTooLarge,
  type FieldErrors,
} from "@/lib/creep-routes/submission";
import { canAcceptSubmissions, createCreepRouteDraft } from "@/lib/creep-routes/submit";
import { getCreepMaps } from "@/lib/creep-routes/maps";
import { getBuilds } from "@/lib/builds/builds";
import { GAME_ICON_OPTIONS } from "@/lib/builds/icons";

export type { FieldErrors };

export type SubmitState =
  | { status: "idle" }
  | { status: "error"; message: string; fields?: FieldErrors }
  | { status: "ok"; slug: string };

/** Minimum seconds a human plausibly needs to fill the form. Same guard as
 *  `submitBuild`. */
const MIN_FILL_SECONDS = 8;

/** Small in-memory throttle: one submission per IP per minute, per
 *  serverless instance — see `submitBuild`'s own comment for why that's
 *  fine here too. */
const recent = new Map<string, number>();
function throttled(ip: string): boolean {
  const now = Date.now();
  for (const [k, t] of recent) if (now - t > 60_000) recent.delete(k);
  const last = recent.get(ip);
  recent.set(ip, now);
  return last !== undefined && now - last < 60_000;
}

export async function submitCreepRoute(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const stopsJsonRaw = String(formData.get("stopsJson") ?? "[]");
  // Reject an oversized payload before it is ever `JSON.parse`d — the
  // schema's `stops.max(30)` bound only applies after a full parse
  // succeeds (code-a.md, "Must fix").
  if (stopsJsonTooLarge(stopsJsonRaw)) {
    return { status: "error", message: "Please fix the highlighted fields.", fields: { stops: "That's too much data for the stops list." } };
  }
  let stops: unknown = [];
  try {
    stops = JSON.parse(stopsJsonRaw);
  } catch {
    return { status: "error", message: "The stops could not be read. Please try again." };
  }

  // The live catalogue the submission is checked against: every map's slug
  // and real camp ids (so a stop can never reference a camp that doesn't
  // exist), every valid icon key, and known build slugs for the optional
  // companion link.
  const [maps, builds] = await Promise.all([getCreepMaps(), getBuilds()]);
  if (!maps.length) {
    return { status: "error", message: "No maps are configured yet. Please try again later." };
  }
  const schema = createSubmissionSchema({
    maps: maps.map((m) => ({ slug: m.slug, campIds: m.camps.map((c) => c.id), startsCount: m.starts.length })),
    iconKeys: GAME_ICON_OPTIONS.map((o) => o.value),
    buildSlugs: builds.map((b) => b.slug),
  });

  const parsed = schema.safeParse({
    map: formData.get("map"),
    race: formData.get("race"),
    vsRaces: formData.getAll("vsRaces").filter(Boolean),
    level: formData.get("level"),
    start: formData.get("start") ?? undefined,
    hero: formData.get("hero") ?? undefined,
    build: formData.get("build") ?? undefined,
    title: formData.get("title"),
    summary: formData.get("summary"),
    author: formData.get("author"),
    authorDiscord: formData.get("authorDiscord") ?? undefined,
    sourceUrl: formData.get("sourceUrl") ?? undefined,
    patch: formData.get("patch") ?? undefined,
    tags: formData.get("tags") ?? undefined,
    description: formData.get("description") ?? undefined,
    stops,
    website: formData.get("website") ?? undefined,
    startedAt: formData.get("startedAt") ?? undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: "Please fix the highlighted fields.", fields: flattenErrors(parsed.error) };
  }
  const data = parsed.data;

  // Spam guards, decided purely (see `decideSubmission`'s own doc comment):
  // a filled honeypot always fakes success without ever reaching
  // `createCreepRouteDraft` below; a too-fast submit rejects with a message.
  const decision = decideSubmission(data, { minFillSeconds: MIN_FILL_SECONDS });
  if (decision.action === "fake-ok") return { status: "ok", slug: "" };
  if (decision.action === "reject") {
    return { status: "error", message: "That was quick, give it another look and submit again." };
  }

  if (!canAcceptSubmissions()) {
    return {
      status: "error",
      message: "Submissions are temporarily unavailable. Post your route in the Gym Discord and a coach will add it.",
    };
  }

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (throttled(ip)) {
    return { status: "error", message: "You just sent one, wait a minute before submitting another route." };
  }

  try {
    const { slug } = await createCreepRouteDraft(data);
    return { status: "ok", slug };
  } catch (err) {
    console.error("[creep-routes] draft creation failed", err);
    return { status: "error", message: "Something went wrong saving your route. Please try again in a moment." };
  }
}
