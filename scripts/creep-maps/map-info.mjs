/** Parses `war3map.w3i` (map metadata) and `war3map.w3e` (terrain header). */

function toBuffer(input) {
  return Buffer.isBuffer(input) ? input : Buffer.from(input.buffer, input.byteOffset, input.byteLength);
}

function readCString(buf, offset) {
  const end = buf.indexOf(0, offset);
  return { value: buf.toString("utf8", offset, end), offset: end + 1 };
}

/** Parses `war3map.w3i`, returning `{ version, cameraBounds, complements }`.
 *
 * `cameraBounds` is `[left, bottom, right, top, ...]` (the raw 8 floats),
 * kept only for reference — creep-routes uses the playable rect (below).
 *
 * `complements` is the `int[4]` right after the camera bounds: the width
 * (in tiles) of the unplayable terrain border on each side, in file order
 * **left, right, bottom, top** (verified against five bundle maps: Autumn
 * Leaves `15,15,15,15`; Echo Isles `6,6,4,8`; Northern Isles `10,10,5,5`).
 * This is what turns the full terrain grid (`.w3e`) into the *playable*
 * rectangle the minimap image (`war3mapMap.blp`) actually covers — see
 * `computePlayableBounds`.
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

  const complements = [];
  for (let i = 0; i < 4; i++) {
    complements.push(buf.readInt32LE(o));
    o += 4;
  }

  return { version, cameraBounds, complements };
}

/** Computes the playable rectangle — the full terrain grid (`terrainBounds`,
 * from `.w3e`) minus the unplayable border `war3map.w3i` records as
 * "complements" (`[left, right, bottom, top]`, in tiles; one tile = 128
 * world units). This is the rectangle the minimap image (`war3mapMap.blp`)
 * actually covers — camps/starts/mines normalise over *this*, not the raw
 * terrain grid, to land on the same pixel as the in-game minimap and
 * coff-creeps' reference (see `coff-reference.test.mjs`). */
export function computePlayableBounds(terrainBounds, complements) {
  const [left, right, bottom, top] = complements;
  return {
    xMin: terrainBounds.xMin + left * 128,
    xMax: terrainBounds.xMax - right * 128,
    yMin: terrainBounds.yMin + bottom * 128,
    yMax: terrainBounds.yMax - top * 128,
  };
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
