#!/usr/bin/env node
/**
 * Fetches every icon `creeps.json` and `items.json` reference from
 * Liquipedia (`File:Wc3<key>.png` on the shared `commons` wiki — same
 * source `icons.mjs`'s map icons use, F008), downscales each to fit within
 * 64x64 (`icons.mjs`'s `downscaleIconPng`), and writes
 * `public/wc3-icons/creeps/<key>.png` / `public/wc3-icons/items/<key>.png`.
 * A key shared by more than one rawcode/item id (e.g. two creep variants
 * using the same button art) is only fetched once.
 *
 *   node scripts/creep-maps/fetch-icons.mjs \
 *     [--creeps <path>] [--items <path>] \
 *     [--out-creeps <dir>] [--out-items <dir>] \
 *     [--missing-out <path>] [--scratch <dir>]
 *
 * Polite recipe (same as F008's `icons.mjs`): descriptive `User-Agent`,
 * >=2s between *every* request (both the `imageinfo` lookup and the actual
 * image download — both hit `liquipedia.net`), API only, never an HTML
 * page. Already-downloaded files are skipped (safe to re-run after an
 * interruption). Icons Liquipedia doesn't have are recorded — name and
 * side, not guessed or invented — in `--missing-out`
 * (`scripts/creep-maps/icons-missing.json` by default); the UI falls back
 * to a lettered chip for those (see spec).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { downscaleIconPng } from "./icons.mjs";

const USER_AGENT = "gnl-w3-creep-routes-bot/1.0 (stefano@eenhoorndigital.com; research use, Liquipedia API)";
const THROTTLE_MS = 2100;

const DEFAULT_CREEPS = fileURLToPath(new URL("../../src/lib/creep-routes/creeps.json", import.meta.url));
const DEFAULT_ITEMS = fileURLToPath(new URL("../../src/lib/creep-routes/items.json", import.meta.url));
const DEFAULT_OUT_CREEPS = fileURLToPath(new URL("../../public/wc3-icons/creeps/", import.meta.url));
const DEFAULT_OUT_ITEMS = fileURLToPath(new URL("../../public/wc3-icons/items/", import.meta.url));
const DEFAULT_MISSING_OUT = fileURLToPath(new URL("./icons-missing.json", import.meta.url));

function parseArgs(argv) {
  const args = {
    creeps: DEFAULT_CREEPS,
    items: DEFAULT_ITEMS,
    outCreeps: DEFAULT_OUT_CREEPS,
    outItems: DEFAULT_OUT_ITEMS,
    missingOut: DEFAULT_MISSING_OUT,
    scratch: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--creeps") args.creeps = argv[++i];
    else if (arg === "--items") args.items = argv[++i];
    else if (arg === "--out-creeps") args.outCreeps = argv[++i];
    else if (arg === "--out-items") args.outItems = argv[++i];
    else if (arg === "--missing-out") args.missingOut = argv[++i];
    else if (arg === "--scratch") args.scratch = argv[++i];
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!args.scratch) {
    throw new Error("usage: fetch-icons.mjs [--creeps <path>] [--items <path>] [--out-creeps <dir>] " +
      "[--out-items <dir>] [--missing-out <path>] --scratch <dir> (originals are never written into the repo)");
  }
  return args;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Resolves `File:Wc3<iconKey>.png`'s real download URL via the MediaWiki
 *  API, or `null` if Liquipedia has no such file. */
async function resolveUrl(iconKey) {
  const title = `File:Wc3${iconKey}.png`;
  const url = `https://liquipedia.net/commons/api.php?action=query&titles=${encodeURIComponent(
    title,
  )}&prop=imageinfo&iiprop=url&format=json`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Liquipedia API ${res.status} for ${title}`);
  const json = await res.json();
  const page = Object.values(json.query.pages)[0];
  if (page.missing !== undefined) return null;
  return page.imageinfo?.[0]?.url ?? null;
}

async function downloadTo(url, destPath) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`download failed (${res.status}): ${url}`);
  writeFileSync(destPath, Buffer.from(await res.arrayBuffer()));
}

/** Fetches one icon end to end: resolve -> (throttle) -> download original
 *  into `scratchDir` -> downscale -> write to `destPath`. Returns `"ok"`,
 *  `"missing"` (Liquipedia has no such file) or throws. */
async function fetchIcon(iconKey, destPath, scratchDir) {
  const url = await resolveUrl(iconKey);
  if (!url) return "missing";
  await sleep(THROTTLE_MS);
  const originalPath = join(scratchDir, `${iconKey}.original.png`);
  await downloadTo(url, originalPath);
  const { png, width, height } = downscaleIconPng(originalPath);
  writeFileSync(destPath, png);
  console.log(`  -> ${width}x${height}, ${png.length} bytes`);
  return "ok";
}

async function fetchSide(keys, outDir, side, scratchDir, missing) {
  let fetched = 0;
  let skipped = 0;
  for (const key of keys) {
    const destPath = join(outDir, `${key}.png`);
    if (existsSync(destPath)) {
      skipped++;
      continue;
    }
    process.stdout.write(`${side} ${key} `);
    try {
      const result = await fetchIcon(key, destPath, scratchDir);
      if (result === "missing") {
        console.log("-> not on Liquipedia");
        missing.push({ side, icon: key });
      } else {
        fetched++;
      }
    } catch (error) {
      console.log(`-> ERROR: ${error.message}`);
      missing.push({ side, icon: key, error: error.message });
    }
    await sleep(THROTTLE_MS);
  }
  return { fetched, skipped };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(args.outCreeps, { recursive: true });
  mkdirSync(args.outItems, { recursive: true });
  mkdirSync(args.scratch, { recursive: true });

  const creeps = JSON.parse(readFileSync(args.creeps, "utf8"));
  const items = JSON.parse(readFileSync(args.items, "utf8"));

  const creepKeys = [...new Set(Object.values(creeps).map((c) => c.icon).filter(Boolean))].sort();
  const itemKeys = [...new Set(Object.values(items).map((it) => it.icon).filter(Boolean))].sort();

  const missing = [];
  const creepResult = await fetchSide(creepKeys, args.outCreeps, "creep", args.scratch, missing);
  const itemResult = await fetchSide(itemKeys, args.outItems, "item", args.scratch, missing);

  writeFileSync(args.missingOut, JSON.stringify(missing, null, 2) + "\n");
  console.log(
    `creeps: ${creepResult.fetched} fetched, ${creepResult.skipped} already present, ${creepKeys.length} total\n` +
      `items: ${itemResult.fetched} fetched, ${itemResult.skipped} already present, ${itemKeys.length} total\n` +
      `missing: ${missing.length} -> ${args.missingOut}`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
