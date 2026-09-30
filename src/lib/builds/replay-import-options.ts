/**
 * F002b: validates the `cutoffSeconds` / `includeUpgrades` / `includeItems`
 * fields `POST /api/replay-import` accepts, from either a multipart form
 * read (string values — `FormData.get` never returns a number or boolean)
 * or a JSON body (native `number`/`boolean`). A field left out of `raw` is
 * left out of `options` too, so spreading the result into
 * `ReplayImportOptions` never sends a value `extractBuild`'s own defaults
 * wouldn't have applied anyway — see replay-import-options.test.mjs's "no
 * options" parity test.
 */

export type ReplayImportOptionsInput = {
  cutoffSeconds?: unknown;
  includeUpgrades?: unknown;
  includeItems?: unknown;
};

/** Ready to spread into `ReplayImportOptions`. */
export type ParsedReplayImportOptions = {
  cutoffMs?: number;
  includeUpgrades?: boolean;
  includeItems?: boolean;
};

export type ParseReplayImportOptionsResult = { ok: true; options: ParsedReplayImportOptions } | { ok: false; error: string };

/** 1 second to 60 minutes. */
const MIN_CUTOFF_SECONDS = 1;
const MAX_CUTOFF_SECONDS = 3600;

function parseBoolean(raw: unknown, field: string): { ok: true; value?: boolean } | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, value: undefined };
  if (typeof raw === "boolean") return { ok: true, value: raw };
  if (raw === "true") return { ok: true, value: true };
  if (raw === "false") return { ok: true, value: false };
  return { ok: false, error: `${field} must be true or false.` };
}

function parseCutoffSeconds(raw: unknown): { ok: true; value?: number } | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, value: undefined };
  const invalid = {
    ok: false as const,
    error: `cutoffSeconds must be a whole number of seconds between ${MIN_CUTOFF_SECONDS} and ${MAX_CUTOFF_SECONDS}.`,
  };
  let n: number;
  if (typeof raw === "number") {
    n = raw;
  } else if (typeof raw === "string" && /^\d+$/.test(raw)) {
    n = Number(raw);
  } else {
    return invalid;
  }
  if (!Number.isInteger(n) || n < MIN_CUTOFF_SECONDS || n > MAX_CUTOFF_SECONDS) return invalid;
  return { ok: true, value: n };
}

/** Parses and validates the three optional import fields. Returns the first
 *  validation error found (checked in field order: cutoff, then upgrades,
 *  then items), or the parsed, ready-to-spread options on success. */
export function parseReplayImportOptions(raw: ReplayImportOptionsInput): ParseReplayImportOptionsResult {
  const cutoff = parseCutoffSeconds(raw.cutoffSeconds);
  if (!cutoff.ok) return cutoff;
  const includeUpgrades = parseBoolean(raw.includeUpgrades, "includeUpgrades");
  if (!includeUpgrades.ok) return includeUpgrades;
  const includeItems = parseBoolean(raw.includeItems, "includeItems");
  if (!includeItems.ok) return includeItems;

  const options: ParsedReplayImportOptions = {};
  if (cutoff.value !== undefined) options.cutoffMs = cutoff.value * 1000;
  if (includeUpgrades.value !== undefined) options.includeUpgrades = includeUpgrades.value;
  if (includeItems.value !== undefined) options.includeItems = includeItems.value;
  return { ok: true, options };
}
