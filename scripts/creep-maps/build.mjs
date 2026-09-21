#!/usr/bin/env node
/**
 * Builds a map catalogue (camps, starts, mines, shops, bounds) plus a
 * 256x256 minimap PNG from a `.w3x`/`.w3m` file.
 *
 *   node scripts/creep-maps/build.mjs <map.w3x> [more.w3x…] --out <dir> [--debug] [--creeps <path>]
 *
 * Writes `<dir>/<slug>.json` and `<dir>/<slug>.png` per map; `--debug` also
 * writes `<dir>/<slug>.debug.png` (the minimap at 3x with camps, mines and
 * starts drawn on top, for eyeballing that the coordinate mapping lines up).
 * `--creeps <path>` points the run at an alternate creep table instead of
 * the checked-in `src/lib/creep-routes/creeps.json` (useful for testing the
 * pipeline against a scratch table without editing the real one).
 *
 * See README.md for where to get map files and what the JSON means.
 */
import { basename, join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { openMap, readMember } from "./mpq.mjs";
import { parseUnitsDoo } from "./units-doo.mjs";
import { parseW3i, parseW3eBounds, computePlayableBounds } from "./map-info.mjs";
import { decodeMinimapCropped, encodePng } from "./minimap.mjs";
import { buildCamps, buildStarts, buildMines, buildShops, countDroppedOutsideBounds } from "./camps.mjs";
import { slugify } from "./slug.mjs";
import { loadCreepTable, getCreep } from "../../src/lib/creep-routes/creeps.mjs";

// The W3Champions 1v1 ladder pool (https://website-backend.w3champions.com/
// api/ladder/active-modes, mode id 1), fetched 2026-09-21. Keyed by the slug
// this script derives from the map's own file name, so a catalogue can
// carry the W3C id/name it corresponds to without a network call per run.
const POOL_MAPS = {
  "autumn-leaves": { w3cMapId: 44, w3cName: "Autumn Leaves v2" },
  "last-refuge": { w3cMapId: 3, w3cName: "Last Refuge" },
  "northern-isles": { w3cMapId: 4, w3cName: "Northern Isles" },
  "shallow-grave": { w3cMapId: 61, w3cName: "Shallow Grave" },
  "tidehunters": { w3cMapId: 54, w3cName: "Tidehunters" },
  "turtle-rock": { w3cMapId: 12, w3cName: "Turtle Rock v2" },
  "twisted-meadows": { w3cMapId: 6, w3cName: "Twisted Meadows" },
  "echo-isles": { w3cMapId: 1051, w3cName: "Echo Isles v2" },
  "springtime": { w3cMapId: 1075, w3cName: "Springtime" },
};

function parseArgs(argv) {
  const files = [];
  let out = null;
  let debug = false;
  let creepsPath = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--out") {
      out = argv[++i];
    } else if (arg === "--debug") {
      debug = true;
    } else if (arg === "--creeps") {
      creepsPath = argv[++i];
    } else {
      files.push(arg);
    }
  }
  if (files.length === 0) throw new Error("usage: build.mjs <map.w3x> [more.w3x…] --out <dir> [--debug] [--creeps <path>]");
  if (!out) throw new Error("usage: build.mjs requires --out <dir>");
  return { files, out, debug, creepsPath };
}

/** Bundle file name → human name and version, e.g. "w3c_AutumnLeaves_v2-0"
 * → { name: "Autumn Leaves", version: "2.0" }. Names with no version suffix
 * (most of the bundle's older revisions) get `version: null`. */
function nameAndVersionFromFile(path) {
  const stem = basename(path).replace(/\.(w3x|w3m)$/i, "").replace(/^w3c_/i, "");
  const versionMatch = stem.match(/_v(\d+(?:[-.]\d+)*)$/i);
  const version = versionMatch ? versionMatch[1].replace(/-/g, ".") : null;
  const withoutVersion = versionMatch ? stem.slice(0, versionMatch.index) : stem;
  const name = withoutVersion.replace(/([a-z0-9])([A-Z])/g, "$1 $2").trim();
  return { name, version };
}

function buildCatalogue(mapPath, creepsPath) {
  const map = openMap(mapPath);
  const doo = parseUnitsDoo(readMember(map, "war3mapUnits.doo"));
  const { bounds: terrainBounds } = parseW3eBounds(readMember(map, "war3map.w3e"));
  const { cameraBounds, complements } = parseW3i(readMember(map, "war3map.w3i"));

  // F001-followup-3: the minimap image (war3mapMap.blp) covers the
  // *playable* rectangle, not the raw terrain grid — see
  // computePlayableBounds's doc comment.
  const bounds = computePlayableBounds(terrainBounds, complements);
  const terrainCentre = {
    x: (terrainBounds.xMin + terrainBounds.xMax) / 2,
    y: (terrainBounds.yMin + terrainBounds.yMax) / 2,
  };

  const creepTable = creepsPath ? loadCreepTable(creepsPath) : loadCreepTable();
  const lookupCreep = (rawcode) => getCreep(rawcode, creepTable);

  // Camp ids are ordered from the terrain centre, not the playable
  // rect's own (often off-centre) one, so switching to playable bounds
  // does not reshuffle ids that were already stable.
  const camps = buildCamps(doo.units, bounds, lookupCreep, terrainCentre);
  const starts = buildStarts(doo.units, bounds);
  const mines = buildMines(doo.units, bounds);
  const shops = buildShops(doo.units, bounds);
  const droppedOutsidePlayable = countDroppedOutsideBounds(doo.units, bounds);

  const { name, version } = nameAndVersionFromFile(mapPath);
  const slug = slugify(name);
  const pool = POOL_MAPS[slug];

  const blp = readMember(map, "war3mapMap.blp");
  const { width, height, data } = decodeMinimapCropped(blp, bounds, slug);
  const png = encodePng(width, height, data);

  const catalogue = {
    slug,
    name: pool?.w3cName ?? name,
    mapVersion: version,
    w3cMapId: pool?.w3cMapId ?? null,
    w3cName: pool?.w3cName ?? null,
    sourceFile: basename(mapPath),
    generatedAt: new Date().toISOString(),
    bounds,
    terrainBounds,
    cameraBounds,
    image: { width, height },
    camps,
    starts,
    mines,
    shops,
  };

  return { catalogue, png, minimap: { width, height, data }, droppedOutsidePlayable };
}

function drawDot(rgba, width, height, px, py, radius, [r, g, b, a]) {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy > radius * radius) continue;
      const x = Math.round(px + dx);
      const y = Math.round(py + dy);
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const i = (y * width + x) * 4;
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = a;
    }
  }
}

const BAND_COLOR = {
  easy: [80, 220, 80, 255],
  medium: [230, 200, 40, 255],
  hard: [230, 60, 60, 255],
};

/** Renders the (possibly non-square, post-crop) minimap at `scale`x with
 * camps/starts/mines drawn on top, for eyeballing that world coordinates
 * line up with the image. */
function renderDebugPng(minimap, catalogue) {
  const scale = 3;
  const outWidth = minimap.width * scale;
  const outHeight = minimap.height * scale;
  const rgba = new Uint8Array(outWidth * outHeight * 4);
  for (let y = 0; y < minimap.height; y++) {
    for (let x = 0; x < minimap.width; x++) {
      const si = (y * minimap.width + x) * 4;
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const di = ((y * scale + sy) * outWidth + (x * scale + sx)) * 4;
          rgba[di] = minimap.data[si];
          rgba[di + 1] = minimap.data[si + 1];
          rgba[di + 2] = minimap.data[si + 2];
          rgba[di + 3] = 255;
        }
      }
    }
  }

  for (const mine of catalogue.mines) {
    drawDot(rgba, outWidth, outHeight, mine.x * outWidth, mine.y * outHeight, 4, [255, 215, 0, 255]);
  }
  for (const start of catalogue.starts) {
    drawDot(rgba, outWidth, outHeight, start.x * outWidth, start.y * outHeight, 6, [40, 120, 255, 255]);
  }
  for (const camp of catalogue.camps) {
    drawDot(rgba, outWidth, outHeight, camp.x * outWidth, camp.y * outHeight, 5, BAND_COLOR[camp.band]);
  }

  return encodePng(outWidth, outHeight, rgba);
}

function main() {
  const { files, out, debug, creepsPath } = parseArgs(process.argv.slice(2));
  mkdirSync(out, { recursive: true });

  for (const file of files) {
    const { catalogue, png, minimap, droppedOutsidePlayable } = buildCatalogue(file, creepsPath);
    writeFileSync(join(out, `${catalogue.slug}.json`), JSON.stringify(catalogue, null, 2) + "\n");
    writeFileSync(join(out, `${catalogue.slug}.png`), png);
    if (debug) {
      writeFileSync(join(out, `${catalogue.slug}.debug.png`), renderDebugPng(minimap, catalogue));
    }
    console.log(
      `${catalogue.slug}: ${catalogue.camps.length} camps, ${catalogue.starts.length} starts, ` +
        `${catalogue.mines.length} mines, ${catalogue.shops.length} shops (mapVersion ${catalogue.mapVersion ?? "unknown"})` +
        (droppedOutsidePlayable ? `, ${droppedOutsidePlayable} dropped outside the playable rect` : ""),
    );
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
