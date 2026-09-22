/** Downloads the **current** W3Champions ladder map files.
 *
 * Two public sources, joined on the W3Champions map id:
 *
 * 1. `website-backend.w3champions.com/api/ladder/active-modes` — the live
 *    pool. No auth. Mode `1` is 1v1. Each entry is `{ id, name, path }`
 *    where `path` ends in the file name *including the map version*
 *    (`3_w3c_260919_1153_LastRefuge_v1.5.w3x`).
 * 2. `github.com/w3champions/map-updater-scripts` (branch `master`),
 *    `maps/w3c_maps/clean_maps/` — the files themselves, named
 *    `1v1_<Name>_<version>@<w3cMapId>.w3x`. The `@<id>` suffix is the same
 *    id the pool API reports, which is what makes the join reliable: names
 *    and version strings differ between the two sources, ids do not.
 *
 * These files are *clean* archives (no `HM3W` header) — `mpq.mjs` handles
 * both shapes.
 *
 * The launcher bundle at `update-service.w3champions.com/api/maps` is NOT a
 * source: it is frozen at the 2021–22 repack and will never update.
 *
 * Usage:
 *   node scripts/creep-maps/fetch-pool.mjs --out <dir> [--mode 1] [--dry-run]
 *
 * Writes each map file into `<dir>/` and a `pool.json` manifest next to
 * them. Files already present with the right size are left alone, so a
 * re-run is cheap.
 */
import { mkdirSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const POOL_URL = "https://website-backend.w3champions.com/api/ladder/active-modes";
const CONTENTS_URL =
  "https://api.github.com/repos/w3champions/map-updater-scripts/contents/maps/w3c_maps/clean_maps";
const UA = "warcraft3.gym creep-route catalogue (+https://warcraft3.gym)";

function parseArgs(argv) {
  let out = null;
  let mode = 1;
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") out = argv[++i];
    else if (argv[i] === "--mode") mode = Number(argv[++i]);
    else if (argv[i] === "--dry-run") dryRun = true;
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  if (!out && !dryRun) throw new Error("usage: fetch-pool.mjs --out <dir> [--mode 1] [--dry-run]");
  if (!Number.isInteger(mode)) throw new Error(`--mode must be an integer, got ${mode}`);
  return { out, mode, dryRun };
}

async function getJson(url) {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  return res.json();
}

/** The live pool for `mode`, as `[{ id, name, file, version }]`. */
export async function livePool(mode = 1) {
  const modes = await getJson(POOL_URL);
  const found = modes.find((m) => m.id === mode);
  if (!found) {
    throw new Error(`mode ${mode} not in active-modes (saw ${modes.map((m) => m.id).join(", ")})`);
  }
  return found.maps.map((m) => {
    const file = String(m.path).split("/").pop();
    const version = file.match(/_v(\d+(?:\.\d+)*)\.w3[xm]$/i)?.[1] ?? null;
    return { id: m.id, name: m.name, file, version };
  });
}

/** The `clean_maps` listing, indexed by the `@<id>` suffix in each name. */
export async function cleanMapIndex() {
  const entries = await getJson(CONTENTS_URL);
  const byId = new Map();
  for (const entry of entries) {
    if (entry.type !== "file") continue;
    const id = entry.name.match(/@(\d+)\.w3[xm]$/i)?.[1];
    if (id === undefined) continue;
    byId.set(Number(id), entry);
  }
  return byId;
}

async function main() {
  const { out, mode, dryRun } = parseArgs(process.argv.slice(2));
  const [pool, index] = await Promise.all([livePool(mode), cleanMapIndex()]);
  if (!dryRun) mkdirSync(out, { recursive: true });

  const manifest = [];
  let missing = 0;
  for (const map of pool) {
    const entry = index.get(map.id);
    if (!entry) {
      missing++;
      console.log(`  MISSING  ${String(map.id).padStart(5)}  ${map.name} — no @${map.id} file in clean_maps`);
      manifest.push({ ...map, sourceFile: null, downloaded: false });
      continue;
    }
    const target = out ? join(out, entry.name) : null;
    let status = "dry-run";
    if (!dryRun) {
      if (existsSync(target) && statSync(target).size === entry.size) {
        status = "cached";
      } else {
        const res = await fetch(entry.download_url, { headers: { "user-agent": UA } });
        if (!res.ok) throw new Error(`GET ${entry.download_url} -> ${res.status}`);
        writeFileSync(target, Buffer.from(await res.arrayBuffer()));
        status = "downloaded";
      }
    }
    console.log(
      `  ${status.padEnd(10)} ${String(map.id).padStart(5)}  ${map.name.padEnd(22)} v${map.version ?? "?"}  ${entry.name}`,
    );
    manifest.push({ ...map, sourceFile: entry.name, bytes: entry.size, downloaded: status !== "dry-run" });
  }

  if (!dryRun) {
    writeFileSync(join(out, "pool.json"), `${JSON.stringify({ mode, fetchedAt: new Date().toISOString(), maps: manifest }, null, 2)}\n`);
  }
  console.log(`\n${pool.length} maps in mode ${mode}; ${missing} without a file in clean_maps.`);
  if (missing > 0) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
