/** Downscales the map-icon PNGs (Liquipedia originals, fetched via their
 * MediaWiki API — see `docs/creep-routes.md`'s "Map icons" section for the
 * exact recipe and every source URL) to fit within 64x64, keeping aspect
 * ratio, and writes them into `public/map-icons/`.
 *
 *   node scripts/creep-maps/icons.mjs <name>=<source.png> [more…] --out <dir>
 *
 * No image-processing dependency exists in the lockfile (`sharp` is not
 * there, same constraint `minimap.mjs` documents) — this is a plain PNG
 * decoder (8-bit depth, non-interlaced, color types 0/2/3/4/6, i.e. every
 * type Liquipedia's originals actually use) plus a box/area downscaler
 * with alpha-premultiplied averaging (so a transparent edge doesn't drag
 * in a dark fringe from whatever RGB an exporter left behind fully-
 * transparent pixels), re-encoded with `minimap.mjs`'s own `encodePng`.
 */
import { readFileSync, writeFileSync, mkdirSync, realpathSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { pathToFileURL } from "node:url";
import { encodePng } from "./minimap.mjs";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/** Decodes a PNG buffer to `{ width, height, data }` RGBA (`Uint8Array`,
 * row-major, no padding). Supports 8-bit depth, non-interlaced, color
 * types 0 (grey), 2 (RGB), 3 (indexed, `PLTE`/`tRNS`), 4 (grey+alpha) and
 * 6 (RGBA) — every type actually seen in Liquipedia's icon exports.
 * Throws on anything else (bit depth != 8, interlaced, unknown color
 * type) rather than silently mis-decoding it. */
export function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("not a PNG (bad signature)");
  let off = 8;
  let width, height, bitDepth, colorType, interlace;
  let plte = null;
  let trns = null;
  const idatChunks = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "PLTE") {
      plte = data;
    } else if (type === "tRNS") {
      trns = data;
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
    off += 8 + len + 4;
  }
  if (bitDepth !== 8) throw new Error(`unsupported PNG bit depth ${bitDepth} (only 8-bit is supported)`);
  if (interlace !== 0) throw new Error("interlaced PNGs are not supported");
  const channelsByColorType = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
  const channels = channelsByColorType[colorType];
  if (channels == null) throw new Error(`unsupported PNG color type ${colorType}`);

  const raw = inflateSync(Buffer.concat(idatChunks));
  const stride = width * channels;
  const out = new Uint8Array(width * height * 4);
  let prevRow = new Uint8Array(stride);
  let rowStart = 0;
  for (let y = 0; y < height; y++) {
    const filterType = raw[rowStart];
    const rowData = raw.subarray(rowStart + 1, rowStart + 1 + stride);
    const curRow = new Uint8Array(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? curRow[x - channels] : 0;
      const b = prevRow[x];
      const c = x >= channels ? prevRow[x - channels] : 0;
      let val = rowData[x];
      if (filterType === 1) val = (val + a) & 0xff;
      else if (filterType === 2) val = (val + b) & 0xff;
      else if (filterType === 3) val = (val + Math.floor((a + b) / 2)) & 0xff;
      else if (filterType === 4) val = (val + paeth(a, b, c)) & 0xff;
      curRow[x] = val;
    }
    for (let px = 0; px < width; px++) {
      const si = px * channels;
      const di = (y * width + px) * 4;
      if (colorType === 6) {
        out[di] = curRow[si];
        out[di + 1] = curRow[si + 1];
        out[di + 2] = curRow[si + 2];
        out[di + 3] = curRow[si + 3];
      } else if (colorType === 2) {
        out[di] = curRow[si];
        out[di + 1] = curRow[si + 1];
        out[di + 2] = curRow[si + 2];
        out[di + 3] = 255;
      } else if (colorType === 3) {
        const idx = curRow[si];
        out[di] = plte[idx * 3];
        out[di + 1] = plte[idx * 3 + 1];
        out[di + 2] = plte[idx * 3 + 2];
        out[di + 3] = trns && idx < trns.length ? trns[idx] : 255;
      } else if (colorType === 0) {
        out[di] = out[di + 1] = out[di + 2] = curRow[si];
        out[di + 3] = 255;
      } else if (colorType === 4) {
        out[di] = out[di + 1] = out[di + 2] = curRow[si];
        out[di + 3] = curRow[si + 1];
      }
    }
    prevRow = curRow;
    rowStart += 1 + stride;
  }
  return { width, height, data: out };
}

/** `w`x`h` scaled to fit within `maxSide` on its longer edge, aspect kept
 * (e.g. the gold mine's 256x211 original becomes 64x53, exactly the
 * spec's "mines 64x53"). */
export function fitDimensions(w, h, maxSide) {
  const scale = maxSide / Math.max(w, h);
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}

/** Box/area downscale of RGBA `src` (`w`x`h`) to `newW`x`newH`, alpha-
 * premultiplied so a transparent source pixel's arbitrary RGB doesn't
 * bleed a dark fringe into a resized edge. */
export function resizeRGBA(src, w, h, newW, newH) {
  const out = new Uint8Array(newW * newH * 4);
  for (let oy = 0; oy < newH; oy++) {
    const y0 = Math.floor((oy * h) / newH);
    const y1 = Math.max(y0 + 1, Math.floor(((oy + 1) * h) / newH));
    for (let ox = 0; ox < newW; ox++) {
      const x0 = Math.floor((ox * w) / newW);
      const x1 = Math.max(x0 + 1, Math.floor(((ox + 1) * w) / newW));
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0, n = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const si = (sy * w + sx) * 4;
          const a = src[si + 3];
          rSum += src[si] * a;
          gSum += src[si + 1] * a;
          bSum += src[si + 2] * a;
          aSum += a;
          n++;
        }
      }
      const di = (oy * newW + ox) * 4;
      const aAvg = aSum / n;
      out[di + 3] = Math.round(aAvg);
      if (aAvg > 0) {
        out[di] = Math.round(rSum / aSum);
        out[di + 1] = Math.round(gSum / aSum);
        out[di + 2] = Math.round(bSum / aSum);
      }
    }
  }
  return out;
}

/** Decodes `sourcePath`, downscales to fit within `maxSide`x`maxSide`
 * (aspect kept), and returns an encoded PNG buffer. */
export function downscaleIconPng(sourcePath, maxSide = 64) {
  const { width, height, data } = decodePng(readFileSync(sourcePath));
  const { w, h } = fitDimensions(width, height, maxSide);
  const resized = w === width && h === height ? data : resizeRGBA(data, width, height, w, h);
  return { png: encodePng(w, h, resized), width: w, height: h };
}

function parseArgs(argv) {
  const entries = [];
  let out = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--out") out = argv[++i];
    else {
      const eq = arg.indexOf("=");
      if (eq === -1) throw new Error(`expected <name>=<source.png>, got "${arg}"`);
      entries.push({ name: arg.slice(0, eq), source: arg.slice(eq + 1) });
    }
  }
  if (!entries.length || !out) {
    throw new Error("usage: icons.mjs <name>=<source.png> [more…] --out <dir>");
  }
  return { entries, out };
}

function main() {
  const { entries, out } = parseArgs(process.argv.slice(2));
  mkdirSync(out, { recursive: true });
  for (const { name, source } of entries) {
    const { png, width, height } = downscaleIconPng(source);
    const destPath = `${out}/${name}.png`;
    writeFileSync(destPath, png);
    console.log(`${name}.png: ${source} -> ${width}x${height}, ${png.length} bytes`);
  }
}

// Guarded, unlike `build.mjs`'s unconditional `main()`: this module's
// decode/resize/encode pieces are also imported directly by
// `icons.test.mjs`, and a bare `main()` call would run the CLI's arg
// parsing (and exit the process) on every import. `realpathSync` resolves
// symlinks on both sides before comparing (macOS's `/tmp` -> `/private/tmp`
// otherwise makes `import.meta.url` and a `/tmp`-rooted `process.argv[1]`
// disagree even when they're the same file).
function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url;
  } catch {
    return false;
  }
}

if (isMainModule()) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
