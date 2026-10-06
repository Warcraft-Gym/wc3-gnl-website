"use server";

import { headers } from "next/headers";
import {
  createSubmissionSchema,
  decideSubmission,
  flattenErrors,
  routeCatalogue,
  routeFormInput,
  stopsJsonTooLarge,
  type FieldErrors,
  type StopInput,
} from "@/lib/creep-routes/submission";
import { keepImages } from "@/lib/creep-routes/keep-images.mjs";
import { sanityClient } from "@/lib/content/sanity";
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
  const input = routeFormInput(formData);
  if (!input) {
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
  const schema = createSubmissionSchema(
    routeCatalogue(
      maps,
      GAME_ICON_OPTIONS.map((o) => o.value),
      builds.map((b) => b.slug),
    ),
  );
  const parsed = schema.safeParse(input);

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

  // A resubmitted route keeps its pictures: copied here from the route it replaces, never from the browser.
  let kept: StopInput[] = data.stops;
  if (data.supersedes) {
    try {
      const old = await sanityClient()?.fetch<unknown[] | null>(`*[_type == "creepRoute" && slug.current == $slug][0].stops`, {
        slug: data.supersedes,
      });
      kept = keepImages(kept, old) as StopInput[];
    } catch (err) {
      console.error("[creep-routes] picture lookup failed; the update arrives without pictures", err);
    }
  }

  try {
    const { slug } = await createCreepRouteDraft({ ...data, stops: kept });
    return { status: "ok", slug };
  } catch (err) {
    console.error("[creep-routes] draft creation failed", err);
    return { status: "error", message: "Something went wrong saving your route. Please try again in a moment." };
  }
}
