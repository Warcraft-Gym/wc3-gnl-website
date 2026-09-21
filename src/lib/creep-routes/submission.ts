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
  /** Real seconds — the schema transforms "1:30"/"16:30" into this. */
  time: number;
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
  hero?: string;
  build?: string;
  title: string;
  summary: string;
  author: string;
  authorDiscord?: string;
  sourceUrl?: string;
  patch?: string;
  tags: string[];
  description?: string;
  stops: StopInput[];
  website?: string;
  startedAt?: number;
};

export type SubmissionCatalogue = {
  maps: { slug: string; campIds: string[] }[];
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
) => Record<string, unknown>;
