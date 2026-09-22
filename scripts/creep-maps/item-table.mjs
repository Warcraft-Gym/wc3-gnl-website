#!/usr/bin/env node
/**
 * Builds `src/lib/creep-routes/items.json` (`{ "<id>": { name, class,
 * level, icon } }`) — the global item dictionary for every item any
 * catalogue's camps can actually drop: a random-pool drop (`kind:
 * "class"`) expands via `itemdata.slk`'s `pickRandom=1` items at that
 * class+level (`drops.mjs`'s `expandPool`); a concrete drop (`kind:
 * "item"`) is itself. Same role as `creep-table.mjs`'s `creeps.json`, one
 * step later in the pipeline: it reads the *catalogues* `build.mjs`
 * already wrote (`camps[].drops[]`, raw — this doesn't need `items[]` to
 * already be embedded there) rather than a fixed id list, since which
 * items are needed depends on which pools the nine maps' creeps actually
 * carry.
 *
 *   node scripts/creep-maps/item-table.mjs \
 *     --itemdata <itemdata.slk> \
 *     --itemstrings <itemstrings.txt> \
 *     --itemfunc <itemfunc.txt> \
 *     [--maps <catalogue-dir>] \
 *     --out src/lib/creep-routes/items.json
 *
 * `--maps` defaults to the checked-in `src/lib/creep-routes/maps/`.
 * `build.mjs` (given the same three source-file flags) independently
 * computes and embeds each catalogue's own `drops[].items[]` from the same
 * `itemdata.slk`/`itemstrings.txt`/`itemfunc.txt` — this script only
 * produces the separate, deduplicated `items.json` lookup; run it after
 * `build.mjs` has (re)written the catalogues so the id set it scans is
 * current.
 *
 * Fails loudly (exit 1, naming every missing id) instead of guessing: an
 * id referenced by a catalogue's drops but absent from the SLK/strings/func
 * tables — no name, no `Art=` line, or no `itemdata.slk` record — stops the
 * run before `--out` is written.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSlk, indexByColumn } from "../../src/lib/creep-routes/slk.mjs";
import { parseIniField, iconKeyFromArt } from "./txt-sections.mjs";
import { expandPool, EXTRA_ITEM_INFO } from "./drops.mjs";

const DEFAULT_MAPS_DIR = fileURLToPath(new URL("../../src/lib/creep-routes/maps/", import.meta.url));

function parseArgs(argv) {
  const args = { itemdata: null, itemstrings: null, itemfunc: null, maps: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--itemdata") args.itemdata = argv[++i];
    else if (arg === "--itemstrings") args.itemstrings = argv[++i];
    else if (arg === "--itemfunc") args.itemfunc = argv[++i];
    else if (arg === "--maps") args.maps = argv[++i];
    else if (arg === "--out") args.out = argv[++i];
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!args.itemdata || !args.itemstrings || !args.itemfunc || !args.out) {
    throw new Error(
      "usage: item-table.mjs --itemdata <path> --itemstrings <path> --itemfunc <path> [--maps <dir>] --out <path>",
    );
  }
  return args;
}

/** Every item id referenced, directly or via a random pool, by any camp's
 *  `drops` across `catalogues` (already-parsed catalogue JSON objects).
 *  `itemdataIndex` is `indexByColumn(parseSlk(itemdataText), "itemID")`. */
export function idsFromCatalogues(catalogues, itemdataIndex) {
  const ids = new Set();
  for (const catalogue of catalogues) {
    for (const camp of catalogue.camps ?? []) {
      for (const drop of camp.drops ?? []) {
        if (drop.kind === "class") {
          for (const id of expandPool(itemdataIndex, drop.class, drop.level)) ids.add(id);
        } else if (drop.kind === "item") {
          ids.add(drop.id);
        }
      }
    }
  }
  return ids;
}

/** Builds `{ name, class, level, icon }` for every id in `ids`, sorted. An
 *  id in `drops.mjs`'s `EXTRA_ITEM_INFO` (one of the four `POOL_OVERRIDES`
 *  additions patch 1.27.1's own SLK/strings/func tables can't resolve) uses
 *  that sourced record directly. Otherwise throws naming every id missing a
 *  name, an `Art=` line, or an `itemdata.slk` record with an integer
 *  `Level` — never guesses. */
export function buildItemsTable(ids, { names, arts, itemdataIndex }) {
  const table = {};
  const missing = [];

  for (const id of [...ids].sort()) {
    const extra = EXTRA_ITEM_INFO[id];
    if (extra) {
      table[id] = { name: extra.name, class: extra.class, level: extra.level, icon: extra.icon };
      continue;
    }

    const name = names.get(id);
    const art = arts.get(id);
    const rec = itemdataIndex.get(id);
    const level = rec ? Number(rec.Level) : NaN;
    const validLevel = Number.isInteger(level);

    if (!name || !art || !rec || !validLevel) {
      missing.push(id);
      continue;
    }

    table[id] = { name, class: rec.class, level, icon: iconKeyFromArt(art) };
  }

  if (missing.length > 0) {
    throw new Error(`missing from the SLK/strings/func tables: ${missing.join(", ")}`);
  }
  return table;
}

function loadCatalogues(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const itemdataIndex = indexByColumn(parseSlk(readFileSync(args.itemdata, "utf8")), "itemID");
  const names = parseIniField(readFileSync(args.itemstrings, "utf8"), "Name");
  const arts = parseIniField(readFileSync(args.itemfunc, "utf8"), "Art");

  const catalogues = loadCatalogues(args.maps ?? DEFAULT_MAPS_DIR);
  const ids = idsFromCatalogues(catalogues, itemdataIndex);
  if (ids.size === 0) {
    throw new Error("no item ids referenced by any catalogue's camps' drops");
  }

  const table = buildItemsTable(ids, { names, arts, itemdataIndex });

  writeFileSync(args.out, JSON.stringify(table, null, 2) + "\n");
  console.log(`wrote ${Object.keys(table).length} entries to ${args.out}`);
}

// Guarded (unlike this repo's other CLI scripts) because `build.mjs`
// imports this module's pure functions directly (`idsFromCatalogues`,
// `buildItemsTable`) to embed each catalogue's own `drops[].items[]` — an
// unconditional `main()` would re-run this script's CLI using `build.mjs`'s
// own `argv` the moment it's imported.
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
