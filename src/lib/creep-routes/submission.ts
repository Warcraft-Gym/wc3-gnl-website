import type { ZodError, ZodType } from "zod";
import * as impl from "./submission.mjs";

/**
 * Typed façade over `submission.mjs`'s pure, plain-JS implementation —
 * same split as `fixtures.mjs`/`fixtures.ts`: the `.mjs` file is what
 * `node --test` checks (see `submission.test.mjs`) with no loader, the
 * `.ts` file is what the rest of the app (the server action, the client
 * form) imports for real types. TS's untyped-JS inference on the `.mjs`
 * exports is too loose to use directly (it infers e.g. `vsRaces:
 * never[]`), so every export is re-typed here rather than consumed as-is.
 */

export type FieldErrors = Record<string, string>;

export type StopInput = {
  campId: string | null;
  action?: string;
  units?: { icon: string; count: number }[];
  note?: string;
  condition?: string;
};

/** The parsed, transformed output of the schema `createSubmissionSchema`
 *  builds — what `toCreepRouteDraft` and `createCreepRouteDraft` consume. */
export type SubmissionInput = {
  map: string;
  race: string;
  vsRaces: string[];
  level: string;
  /** Index into the chosen map's `starts` — which spawn is *your* base;
   *  omitted (or 0) means the first start. */
  start?: number;
  hero?: string;
  build?: string;
  title: string;
  summary: string;
  author: string;
  authorDiscord?: string;
  sourceUrl?: string;
  /** YouTube or Vimeo link, embedded on the route page. */
  videoUrl?: string;
  /** Slug of the route this submission replaces, when an author resubmits
   *  an updated version (the site has no accounts, so editing in place has
   *  nobody to authenticate against). */
  supersedes?: string;
  patch?: string;
  tags: string[];
  description?: string;
  stops: StopInput[];
  website?: string;
  startedAt?: number;
};

export type SubmissionCatalogue = {
  /** `startsCount` is optional — omit it to skip the `start >= starts.length`
   *  check (e.g. a caller that doesn't have the live map's `starts` handy). */
  maps: { slug: string; campIds: string[]; startsCount?: number }[];
  iconKeys: string[];
  buildSlugs?: string[];
};

export const createSubmissionSchema = impl.createSubmissionSchema as (
  catalogue: SubmissionCatalogue,
) => ZodType<SubmissionInput>;

export const flattenErrors = impl.flattenErrors as (err: ZodError) => FieldErrors;

export const toCreepRouteDraft = impl.toCreepRouteDraft as (
  valid: SubmissionInput,
  mapDocId: string,
  buildDocId?: string,
  supersedesDocId?: string,
) => Record<string, unknown>;

/** The slug out of a pasted slug, path or full URL — see the `.mjs`. */
export const slugFromInput = impl.slugFromInput as (value: string) => string;

export const MAX_STOPS_JSON_BYTES = impl.MAX_STOPS_JSON_BYTES as number;

export const stopsJsonTooLarge = impl.stopsJsonTooLarge as (raw: string) => boolean;

export type SubmissionDecision =
  | { action: "fake-ok" }
  | { action: "reject"; reason: "too-fast" }
  | { action: "proceed" };

export const decideSubmission = impl.decideSubmission as (
  data: SubmissionInput,
  opts?: { now?: number; minFillSeconds?: number },
) => SubmissionDecision;
