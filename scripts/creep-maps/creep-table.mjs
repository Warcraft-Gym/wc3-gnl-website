#!/usr/bin/env node
/**
 * Rebuilds `creeps.json` (rawcode -> `{ name, level, sleeps, source, icon?
 * }`) from Blizzard's own game data (patch 1.27.1 enUS, mirrored in the
 * w3x2lni repository) instead of transcribing wiki pages by hand: a
 * cross-check found 2 of 5 spot-checked wiki-sourced entries named the
 * wrong unit for their rawcode (see this feature's handoff), so the SLK
 * data is now the one source of truth.
 *
 *   node scripts/creep-maps/creep-table.mjs \
 *     --strings <neutralunitstrings.txt> \
 *     --balance <unitbalance.slk> \
 *     --data <unitdata.slk> \
 *     [--func <neutralunitfunc.txt>] \
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
 * `--func` (F011) adds `icon: "BTN<Name>"` per entry, read from
 * `neutralunitfunc.txt`'s `Art=ReplaceableTextures\CommandButtons\BTN<Name>.blp`
 * — the key `fetch-icons.mjs` fetches from Liquipedia and the key
 * `public/wc3-icons/creeps/<key>.png` files use. Omitted (no `icon` field
 * at all) when `--func` isn't given, same opt-in shape as every other
 * optional source in this script.
 *
 * Fails loudly (exit 1, naming every missing id) instead of guessing: a
 * requested id absent from any of the required source files — no name, no
 * integer level 1-10, no `canSleep` flag, or (only when `--func` is given)
 * no `Art=` line — stops the run before `--out` is written.
 */
import { readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSlk, indexByColumn } from "../../src/lib/creep-routes/slk.mjs";
import { parseIniField, iconKeyFromArt } from "./txt-sections.mjs";

// Cited per entry as `source`: this is where the `level` (and, by the same
// method, `sleeps`/`name` from the sibling files) came from.
const BALANCE_SOURCE_URL =
  "https://raw.githubusercontent.com/sumneko/w3x2lni/master/data/enUS-1.27.1/mpq/Custom_V1/Units/unitbalance.slk";

const DEFAULT_MAPS_DIR = fileURLToPath(new URL("../../src/lib/creep-routes/maps/", import.meta.url));

function parseArgs(argv) {
  const args = { strings: null, balance: null, data: null, func: null, ids: null, all: false, out: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--strings") args.strings = argv[++i];
    else if (arg === "--balance") args.balance = argv[++i];
    else if (arg === "--data") args.data = argv[++i];
    else if (arg === "--func") args.func = argv[++i];
    else if (arg === "--ids") args.ids = argv[++i];
    else if (arg === "--all") args.all = true;
    else if (arg === "--out") args.out = argv[++i];
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!args.strings || !args.balance || !args.data || !args.out) {
    throw new Error(
      "usage: creep-table.mjs --strings <path> --balance <path> --data <path> [--func <path>] " +
        "[--ids <dir-or-list>] [--all] --out <path>",
    );
  }
  return args;
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

/** Creeps the current ladder pool places that the 1.27.1 enUS tables do not
 * know about, because Blizzard added them after that patch. Each entry must
 * cite where its values come from; this is a last resort, not a dumping
 * ground, and `buildTable` still refuses any id that is in neither the SLK
 * tables nor here.
 *
 * `nggm` — placed once on Tidehunters v1.2. Absent from 1.27.1 entirely; it
 * is the moss-covered art variant of `nggr` "Granite Golem", which 1.27.1
 * does carry. Verified identical where both are known: `nggr` is level 9 /
 * `canSleep 0` in 1.27.1, and `nggm` is level 9 in the 1.32.8 tables
 * (`data/zhCN-1.32.8/mpq/Units/unitbalance.slk` in the same mirror — the
 * numbers are language-independent). Liquipedia's own Tidehunters preview
 * calls it plainly "Granite Golem", so that is the name players use and the
 * one we show. Icon reused from `nggr` (`BTNRockGolem`). */
const EXTRA_CREEP_INFO = {
  nggm: {
    name: "Granite Golem",
    level: 9,
    sleeps: false,
    icon: "BTNRockGolem",
    source: "https://raw.githubusercontent.com/sumneko/w3x2lni/master/data/zhCN-1.32.8/mpq/Units/unitbalance.slk",
  },
};

/** Builds `{ name, level, sleeps, source, icon? }` for every id in `ids`,
 * sorted. Throws naming every id missing a name, a valid level, a sleeps
 * flag, or (only when `arts` is given) an `Art=` line — never guesses. */
function buildTable(ids, names, balanceById, dataById, arts) {
  const table = {};
  const missing = [];

  for (const id of [...ids].sort()) {
    const name = names.get(id);
    const balance = balanceById.get(id);
    const data = dataById.get(id);
    const level = balance ? Number(balance.level) : NaN;
    const validLevel = Number.isInteger(level) && level >= 1 && level <= 10;
    const art = arts ? arts.get(id) : undefined;

    if (!name || !balance || !validLevel || !data || data.canSleep === undefined || (arts && !art)) {
      const extra = EXTRA_CREEP_INFO[id];
      if (extra) {
        table[id] = { ...extra };
        if (!arts) delete table[id].icon;
        continue;
      }
      missing.push(id);
      continue;
    }

    table[id] = {
      name,
      level,
      sleeps: data.canSleep === "1",
      source: BALANCE_SOURCE_URL,
      ...(art ? { icon: iconKeyFromArt(art) } : {}),
    };
  }

  if (missing.length > 0) {
    throw new Error(`missing from the SLK/strings${arts ? "/func" : ""} tables: ${missing.join(", ")}`);
  }
  return table;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const names = parseIniField(readFileSync(args.strings, "utf8"), "Name");
  const balanceById = indexByColumn(parseSlk(readFileSync(args.balance, "utf8")), "unitBalanceID");
  const dataById = indexByColumn(parseSlk(readFileSync(args.data, "utf8")), "unitID");
  const arts = args.func ? parseIniField(readFileSync(args.func, "utf8"), "Art") : null;

  const ids = resolveIds(args, names);
  if (ids.size === 0) {
    throw new Error("no rawcodes to build: empty --ids source, and no catalogues found under the default maps dir");
  }

  const table = buildTable(ids, names, balanceById, dataById, arts);

  writeFileSync(args.out, JSON.stringify(table, null, 2) + "\n");
  console.log(`wrote ${Object.keys(table).length} entries to ${args.out}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
