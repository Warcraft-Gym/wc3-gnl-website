/** Decodes `war3mapMap.blp` to RGBA and encodes it as a plain PNG.
 *
 * No PNG dependency exists in the lockfile (checked; `sharp` is not there),
 * so this is a small filter-0, single-IDAT PNG writer built on `node:zlib`
 * — the minimap is always 256x256, one image, no need for anything fancier.
 */
import { deflateSync } from "node:zlib";
import { decodeBLP, getBLPImageData } from "war3-model";
import { cropLetterbox } from "../../src/lib/creep-routes/minimap-crop.mjs";

function toArrayBuffer(input) {
  if (input instanceof ArrayBuffer) return input;
  return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
}

/** Decodes a `war3mapMap.blp` buffer to `{ width, height, data }` RGBA. */
export function decodeMinimap(blpBuffer) {
  const image = decodeBLP(toArrayBuffer(blpBuffer));
  const { width, height, data } = getBLPImageData(image, 0);
  return { width, height, data };
}

/** Decodes `war3mapMap.blp` and crops its letterbox bands (see
 * `minimap-crop.mjs`) so the result's aspect matches the map's own
 * `bounds`. `mapLabel` (e.g. the map's slug) is only used to name the map
 * in the thrown error on an aspect mismatch. */
export function decodeMinimapCropped(blpBuffer, bounds, mapLabel) {
  const { width, height, data } = decodeMinimap(blpBuffer);
  const boundsAspect = (bounds.xMax - bounds.xMin) / (bounds.yMax - bounds.yMin);
  try {
    return cropLetterbox(data, width, height, boundsAspect);
  } catch (error) {
    throw new Error(`${mapLabel}: ${error.message}`);
  }
}

function crc32(buf) {
  let c;
  const table = crc32.table ?? (crc32.table = makeCrcTable());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(crc ^ buf[i]) & 0xff];
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** Encodes RGBA pixel data (`Uint8Array`/`Uint8ClampedArray`, row-major, no
 * padding) into a PNG file buffer. */
export function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type: none
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    );
  }
  const idat = deflateSync(raw);

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
