/** Parses `war3map.w3i` (map metadata) and `war3map.w3e` (terrain header). */

function toBuffer(input) {
  return Buffer.isBuffer(input) ? input : Buffer.from(input.buffer, input.byteOffset, input.byteLength);
}

function readCString(buf, offset) {
  const end = buf.indexOf(0, offset);
  return { value: buf.toString("utf8", offset, end), offset: end + 1 };
}

/** Parses `war3map.w3i`, returning `{ version, cameraBounds }`.
 *
 * `cameraBounds` is `[left, bottom, right, top, ...]` (the raw 8 floats),
 * kept only for reference — creep-routes uses the `.w3e` terrain bounds.
 */
export function parseW3i(input) {
  const buf = toBuffer(input);
  let o = 0;
  const version = buf.readInt32LE(o);
  o += 4;
  o += 4; // saves
  o += 4; // editorVersion
  if (version >= 28) {
    o += 16; // int[4] gameVersion
  }
  ({ offset: o } = readCString(buf, o)); // name
  ({ offset: o } = readCString(buf, o)); // author
  ({ offset: o } = readCString(buf, o)); // description
  ({ offset: o } = readCString(buf, o)); // players recommendation

  const cameraBounds = [];
  for (let i = 0; i < 8; i++) {
    cameraBounds.push(buf.readFloatLE(o));
    o += 4;
  }

  return { version, cameraBounds };
}

/** Parses `war3map.w3e`'s fixed header, returning terrain `bounds`.
 *
 * `centerOffsetX/Y` is the world coordinate of the grid's *minimum* corner
 * (verified: on every map we have, `centerOffsetX + (width-1)*128` lands
 * exactly on the mirror of `centerOffsetX`, and the byte length of the
 * whole file — `37 + tilesets*4 + width*height*7` — only comes out exact
 * with `width`/`height` read as the raw grid corner counts below, not
 * `war3map.w3i`'s smaller `playableWidth`/`playableHeight`, which excludes
 * the unused terrain border most maps carry). The minimap PNG covers this
 * whole grid, border included, so this is also the space that lines camps
 * up with the minimap image.
 */
export function parseW3eBounds(input) {
  const buf = toBuffer(input);
  const magic = buf.toString("latin1", 0, 4);
  if (magic !== "W3E!") {
    throw new Error(`war3map.w3e has the wrong magic: ${magic}`);
  }
  let o = 4;
  o += 4; // version
  o += 1; // tileset
  o += 4; // customTilesets (0 or 1)
  const groundCount = buf.readInt32LE(o);
  o += 4 + groundCount * 4;
  const cliffCount = buf.readInt32LE(o);
  o += 4 + cliffCount * 4;
  const width = buf.readInt32LE(o); // corner count = tiles + 1
  o += 4;
  const height = buf.readInt32LE(o); // corner count = tiles + 1
  o += 4;
  const xMin = buf.readFloatLE(o);
  o += 4;
  const yMin = buf.readFloatLE(o);
  o += 4;

  const xMax = xMin + (width - 1) * 128;
  const yMax = yMin + (height - 1) * 128;

  return { bounds: { xMin, xMax, yMin, yMax } };
}
