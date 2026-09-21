#!/usr/bin/env node
/**
 * Rebuilds `creeps.json` (rawcode -> `{ name, level, sleeps, source }`)
 * from Blizzard's own game data (patch 1.27.1 enUS, mirrored in the
 * w3x2lni repository) instead of transcribing wiki pages by hand: a
 * cross-check found 2 of 5 spot-checked wiki-sourced entries named the
 * wrong unit for their rawcode (see this feature's handoff), so the SLK
 * data is now the one source of truth.
 *
 *   node scripts/creep-maps/creep-table.mjs \
 *     --strings <neutralunitstrings.txt> \
 *     --balance <unitbalance.slk> \
 *     --data <unitdata.slk> \
 *     [--ids <path-to-catalogue-dir-or-id-list>] \
 *     [--all] \
 *     --out src/lib/creep-routes/creeps.json
 *
 * By default, builds an entry for every rawcode referenced by any
 * catalogue's camps under `src/lib/creep-routes/maps/*.json`. `--ids
 * <dir>` points at a different catalogue directory; `--ids <file>` reads
 * an explicit rawcode list instead (a JSON array, or one rawcode per
 * line). `--all` ignores catalogues and builds every id that has a
 * `Name=` entry in the strings file, i.e. every neutral unit the game
 * knows about, not just the ones current catalogues use.
 *
 * Fails loudly (exit 1, naming every missing id) instead of guessing: a
 * requested id absent from any of the three source files — no name, no
 * integer level 1-10, or no `canSleep` flag — stops the run before
 * `--out` is written.
 */
import { readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSlk, indexByColumn } from "../../src/lib/creep-routes/slk.mjs";

// Cited per entry as `source`: this is where the `level` (and, by the same
// method, `sleeps`/`name` from the sibling files) came from.
const BALANCE_SOURCE_URL =
  "https://raw.githubusercontent.com/sumneko/w3x2lni/master/data/enUS-1.27.1/mpq/Custom_V1/Units/unitbalance.slk";

const DEFAULT_MAPS_DIR = fileURLToPath(new URL("../../src/lib/creep-routes/maps/", import.meta.url));

function parseArgs(argv) {
  const args = { strings: null, balance: null, data: null, ids: null, all: false, out: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--strings") args.strings = argv[++i];
    else if (arg === "--balance") args.balance = argv[++i];
    else if (arg === "--data") args.data = argv[++i];
    else if (arg === "--ids") args.ids = argv[++i];
    else if (arg === "--all") args.all = true;
    else if (arg === "--out") args.out = argv[++i];
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!args.strings || !args.balance || !args.data || !args.out) {
    throw new Error(
      "usage: creep-table.mjs --strings <path> --balance <path> --data <path> [--ids <dir-or-list>] [--all] --out <path>",
    );
  }
  return args;
}

/** Parses `neutralunitstrings.txt`'s `[rawcode]` sections into
 * `Map<rawcode, name>`, one entry per section's `Name=` field. */
function parseNeutralStrings(text) {
  const names = new Map();
  let section = null;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    const sectionMatch = trimmed.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      section = sectionMatch[1];
      continue;
    }
    if (section && trimmed.startsWith("Name=")) {
      names.set(section, trimmed.slice("Name=".length));
    }
  }
  return names;
}

/** Every creep rawcode any catalogue's camps reference, from every
 * `*.json` file directly inside `dir`. */
function idsFromCatalogueDir(dir) {
  const ids = new Set();
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const catalogue = JSON.parse(readFileSync(join(dir, file), "utf8"));
    for (const camp of catalogue.camps ?? []) {
      for (const creep of camp.creeps ?? []) ids.add(creep.id);
    }
  }
  return ids;
}

/** Resolves `--ids <path>`: a directory of catalogues (same extraction as
 * the default), a JSON array of rawcodes, or one rawcode per line. */
function idsFromPath(path) {
  if (statSync(path).isDirectory()) return idsFromCatalogueDir(path);

  const text = readFileSync(path, "utf8");
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return new Set(parsed);
  } catch {
    // Not JSON — fall through to newline-separated parsing below.
  }
  return new Set(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  );
}

function resolveIds(args, names) {
  if (args.all) return new Set(names.keys());
  if (args.ids) return idsFromPath(args.ids);
  return idsFromCatalogueDir(DEFAULT_MAPS_DIR);
}

/** Builds `{ name, level, sleeps, source }` for every id in `ids`, sorted.
 * Throws naming every id missing a name, a valid level, or a sleeps flag —
 * never guesses. */
function buildTable(ids, names, balanceById, dataById) {
  const table = {};
  const missing = [];

  for (const id of [...ids].sort()) {
    const name = names.get(id);
    const balance = balanceById.get(id);
    const data = dataById.get(id);
    const level = balance ? Number(balance.level) : NaN;
    const validLevel = Number.isInteger(level) && level >= 1 && level <= 10;

    if (!name || !balance || !validLevel || !data || data.canSleep === undefined) {
      missing.push(id);
      continue;
    }

    table[id] = {
      name,
      level,
      sleeps: data.canSleep === "1",
      source: BALANCE_SOURCE_URL,
    };
  }

  if (missing.length > 0) {
    throw new Error(`missing from the SLK/strings tables: ${missing.join(", ")}`);
  }
  return table;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const names = parseNeutralStrings(readFileSync(args.strings, "utf8"));
  const balanceById = indexByColumn(parseSlk(readFileSync(args.balance, "utf8")), "unitBalanceID");
  const dataById = indexByColumn(parseSlk(readFileSync(args.data, "utf8")), "unitID");

  const ids = resolveIds(args, names);
  if (ids.size === 0) {
    throw new Error("no rawcodes to build: empty --ids source, and no catalogues found under the default maps dir");
  }

  const table = buildTable(ids, names, balanceById, dataById);

  writeFileSync(args.out, JSON.stringify(table, null, 2) + "\n");
  console.log(`wrote ${Object.keys(table).length} entries to ${args.out}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
