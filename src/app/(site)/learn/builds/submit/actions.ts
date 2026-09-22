"use server";

import { headers } from "next/headers";
import { flattenErrors, submissionSchema, type FieldErrors } from "@/lib/builds/submission";
import { canAcceptSubmissions, createBuildDraft } from "@/lib/builds/submit";

export type SubmitState =
  | { status: "idle" }
  | { status: "error"; message: string; fields?: FieldErrors }
  | { status: "ok"; slug: string };

/** Minimum seconds a human plausibly needs to fill the form. */
const MIN_FILL_SECONDS = 8;

/**
 * Small in-memory throttle: one submission per IP per minute. It is per
 * serverless instance rather than global, which is fine, the honeypot and
 * fill-time checks do most of the work, and every submission still lands in
 * the review queue rather than on the site.
 */
const recent = new Map<string, number>();
function throttled(ip: string): boolean {
  const now = Date.now();
  for (const [k, t] of recent) if (now - t > 60_000) recent.delete(k);
  const last = recent.get(ip);
  recent.set(ip, now);
  return last !== undefined && now - last < 60_000;
}

export async function submitBuild(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  let steps: unknown = [];
  try {
    steps = JSON.parse(String(formData.get("stepsJson") ?? "[]"));
  } catch {
    return { status: "error", message: "The steps could not be read. Please try again." };
  }

  const parsed = submissionSchema.safeParse({
    title: formData.get("title"),
    race: formData.get("race"),
    vsRaces: formData.getAll("vsRaces").filter(Boolean),
    difficulty: formData.get("difficulty"),
    patch: formData.get("patch") ?? undefined,
    tags: formData.get("tags") ?? undefined,
    summary: formData.get("summary"),
    author: formData.get("author"),
    authorDiscord: formData.get("authorDiscord") ?? undefined,
    sourceUrl: formData.get("sourceUrl") ?? undefined,
    supersedes: formData.get("supersedes") ?? undefined,
    description: formData.get("description") ?? undefined,
    steps,
    website: formData.get("website") ?? undefined,
    startedAt: formData.get("startedAt") ?? undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: "Please fix the highlighted fields.", fields: flattenErrors(parsed.error) };
  }
  const data = parsed.data;

  // Spam guards: honeypot filled, or submitted faster than a human could.
  if (data.website) return { status: "ok", slug: "" };
  if (data.startedAt && Date.now() - data.startedAt < MIN_FILL_SECONDS * 1000) {
    return { status: "error", message: "That was quick, give it another look and submit again." };
  }

  if (!canAcceptSubmissions()) {
    return {
      status: "error",
      message: "Submissions are temporarily unavailable. Post your build in the Gym Discord and a coach will add it.",
    };
  }

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (throttled(ip)) {
    return { status: "error", message: "You just sent one, wait a minute before submitting another build." };
  }

  try {
    const { slug } = await createBuildDraft(data);
    return { status: "ok", slug };
  } catch (err) {
    console.error("[builds] draft creation failed", err);
    return { status: "error", message: "Something went wrong saving your build. Please try again in a moment." };
  }
}
