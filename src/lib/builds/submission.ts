import { z } from "zod";
import { BUILD_DIFFICULTIES, BUILD_RACES } from "./types";
import { getGameIcon } from "./icons";
import { slugFromInput } from "@/lib/creep-routes/submission";

/**
 * Validation for public build submissions. Shared shape between the client
 * form (for messages) and the server action (the real gate).
 */

const raceIds = BUILD_RACES.map((r) => r.id) as [string, ...string[]];
const difficultyIds = BUILD_DIFFICULTIES.map((d) => d.id) as [string, ...string[]];

const clock = z
  .string()
  .trim()
  .max(5)
  .refine((v) => v === "" || /^\d{1,2}:\d{2}$/.test(v), "Use mm:ss, e.g. 1:30")
  .optional();

export const stepSchema = z.object({
  time: clock,
  supply: z
    .union([z.number().int().min(0).max(100), z.nan(), z.undefined()])
    .transform((v) => (typeof v === "number" && !Number.isNaN(v) ? v : undefined)),
  instruction: z.string().trim().min(2, "Say what to do").max(160, "Keep it under 160 characters"),
  icon: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || Boolean(getGameIcon(v)), "Unknown icon"),
});

export const submissionSchema = z.object({
  title: z.string().trim().min(6, "Give it a proper title").max(90, "Max 90 characters"),
  race: z.enum(raceIds, { error: "Pick your race" }),
  vsRaces: z.array(z.enum(raceIds)).max(4).transform((v) => [...new Set(v)]),
  difficulty: z.enum(difficultyIds, { error: "Pick a difficulty" }),
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
  summary: z.string().trim().min(20, "A sentence or two, at least 20 characters").max(200, "Max 200 characters"),
  author: z.string().trim().min(2, "Who should we credit?").max(60, "Max 60 characters"),
  authorDiscord: z.string().trim().max(60, "Max 60 characters").optional(),
  sourceUrl: z
    .string()
    .trim()
    .max(300)
    .optional()
    .refine((v) => !v || /^https?:\/\//.test(v), "Must start with http(s)://"),
  /** Slug of the build this submission replaces. The site has no accounts,
   *  so an author updating a build resubmits it and names the old one; a
   *  coach approves the replacement and archives what it replaced, which
   *  also means the change is reviewed rather than going live unseen. */
  supersedes: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => (v ? slugFromInput(v) : undefined)),
  description: z.string().trim().max(6000, "Max 6000 characters").optional(),
  steps: z.array(stepSchema).min(3, "Add at least three steps").max(60, "Max 60 steps"),
  /** Honeypot, must stay empty. */
  website: z.string().max(0).optional(),
  /** Client timestamp when the form was opened; bots submit instantly. */
  startedAt: z.coerce.number().optional(),
});

export type BuildSubmission = z.infer<typeof submissionSchema>;
export type StepInput = z.input<typeof stepSchema>;

/** Field-level messages keyed by path ("title", "steps.2.instruction"). */
export type FieldErrors = Record<string, string>;

export function flattenErrors(err: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
