/** Parses `war3map.w3i` (map metadata) and `war3map.w3e` (terrain header). */

function toBuffer(input) {
  return Buffer.isBuffer(input) ? input : Buffer.from(input.buffer, input.byteOffset, input.byteLength);
}

/** A small sequential-read cursor over a `war3map.w3i` buffer — the format
 * has no top-level length prefixes, so every field has to be read in exact
 * file order. Used only by `parseW3i`'s full walk (F011: reaching the
 * random item tables at the end means consuming everything before them). */
class W3iCursor {
  #buf;
  offset = 0;

  constructor(buf) {
    this.#buf = buf;
  }

  i32() {
    const v = this.#buf.readInt32LE(this.offset);
    this.offset += 4;
    return v;
  }

  f32() {
    const v = this.#buf.readFloatLE(this.offset);
    this.offset += 4;
    return v;
  }

  u8() {
    const v = this.#buf.readUInt8(this.offset);
    this.offset += 1;
    return v;
  }

  /** Fixed-length raw chars (a rawcode/tag), not null-terminated. */
  chars(n) {
    const v = this.#buf.toString("latin1", this.offset, this.offset + n);
    this.offset += n;
    return v;
  }

  /** Null-terminated string. Can't be used where the file allows a value
   *  with no null byte before the field's true end (e.g. `campaignBg`'s
   *  `-1`, all `0xff`) — those fields are read with fixed-width helpers
   *  instead, verified byte-exact against all nine bundle maps' `war3map.w3i`
   *  (see this feature's handoff for the reverse-engineering evidence). */
  cstr() {
    const end = this.#buf.indexOf(0, this.offset);
    const v = this.#buf.toString("utf8", this.offset, end);
    this.offset = end + 1;
    return v;
  }
}

/** Parses `war3map.w3i`, returning `{ version, cameraBounds, complements,
 * randomItemTables }`.
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
 *
 * `randomItemTables` (F011) is `[{ id, name, sets }]` — the map-level
 * random item tables declared in the World Editor's "Random Item Table"
 * dialog, `sets: [[{ itemId, chance }]]` (one array per pool). A unit's
 * `war3mapUnits.doo` `itemTablePointer` (see `units-doo.mjs`) indexes into
 * this list by `id`, not by array position. To reach this section the
 * parser has to walk everything before it in file order (players, forces,
 * upgrade/tech availability, then the random *unit* tables) — every field
 * from `campaignBg` onward was reverse-engineered by byte-exact
 * cross-checking against all nine bundle maps' real `war3map.w3i` (every
 * one consumes to exactly its own file length; the two player records'
 * `x`/`y` also independently matched `units-doo.test.mjs`'s known Autumn
 * Leaves start positions) — see this feature's handoff for the full
 * derivation. None of the nine bundle maps actually populate this section
 * (all their units' `itemTablePointer` is `-1`), so it is exercised for
 * real by every map's byte-exact-consumption check, and by a synthetic
 * `drops.test.mjs` case for the *resolution* logic. */
export function parseW3i(input) {
  const buf = toBuffer(input);
  const c = new W3iCursor(buf);

  const version = c.i32();
  c.i32(); // saves
  c.i32(); // editorVersion
  if (version >= 28) {
    c.i32();
    c.i32();
    c.i32();
    c.i32(); // gameVersion major/minor/patch/build
  }
  c.cstr(); // name
  c.cstr(); // author
  c.cstr(); // description
  c.cstr(); // players recommendation

  const cameraBounds = [];
  for (let i = 0; i < 8; i++) cameraBounds.push(c.f32());

  const complements = [];
  for (let i = 0; i < 4; i++) complements.push(c.i32());

  c.i32(); // playable width
  c.i32(); // playable height
  c.i32(); // flags
  c.u8(); // tileset (single char)
  c.i32(); // campaign background number (-1 = none)
  c.i32(); // loading screen background number
  c.cstr(); // loading screen text
  c.cstr(); // loading screen title
  c.cstr(); // loading screen subtitle
  c.i32(); // game data set
  c.i32(); // fog type
  c.f32(); // fog start
  c.f32(); // fog end
  c.f32(); // fog density
  c.u8();
  c.u8();
  c.u8();
  c.u8(); // fog color (RGB + unused alpha)
  c.chars(4); // global weather (4-char tag, or all-zero for none)
  c.cstr(); // custom sound environment
  c.u8(); // custom light environment tileset (single char)
  c.u8();
  c.u8();
  c.u8();
  c.u8(); // water tinting color (RGB + unused alpha)
  // Three more int32 fields precede the player list on every map this
  // parser has seen (verified: skipping exactly 12 bytes here is what
  // makes every one of the nine bundle maps' war3map.w3i consume to
  // exactly its own file length, and land the first two players' x/y on
  // the known Autumn Leaves start positions — see units-doo.test.mjs).
  // Newer format docs (Reforged's v33 war3map.w3i) name a same-sized,
  // same-position trio "scriptLanguage"/"supportedModes"/"gameDataVersion";
  // not identified with certainty for this file's version (31), so left
  // unnamed and unused rather than guessed.
  c.i32();
  c.i32();
  c.i32();

  const playerCount = c.i32();
  for (let p = 0; p < playerCount; p++) {
    c.i32(); // player number
    c.i32(); // type
    c.i32(); // race
    c.i32(); // fixed start position
    c.cstr(); // name
    c.f32(); // start x
    c.f32(); // start y
    c.i32();
    c.i32();
    c.i32();
    c.i32(); // ally/enemy low/high priority bitfields
  }

  const forceCount = c.i32();
  for (let f = 0; f < forceCount; f++) {
    c.i32(); // flags
    c.i32(); // player bitmask
    c.cstr(); // name
  }

  const upgradeCount = c.i32();
  for (let u = 0; u < upgradeCount; u++) {
    c.i32(); // player bitmask
    c.chars(4); // upgrade id
    c.i32(); // level
    c.i32(); // availability
  }

  const techCount = c.i32();
  for (let t = 0; t < techCount; t++) {
    c.i32(); // player bitmask
    c.chars(4); // tech id
  }

  const randomUnitTableCount = c.i32();
  for (let g = 0; g < randomUnitTableCount; g++) {
    c.i32(); // table number
    c.cstr(); // name
    const positionCount = c.i32();
    for (let i = 0; i < positionCount; i++) c.i32(); // position "type" per column
    const rowCount = c.i32();
    for (let r = 0; r < rowCount; r++) {
      c.i32(); // chance
      for (let i = 0; i < positionCount; i++) c.chars(4); // one id per column
    }
  }

  const randomItemTableCount = c.i32();
  const randomItemTables = [];
  for (let t = 0; t < randomItemTableCount; t++) {
    const id = c.i32();
    const name = c.cstr();
    const setCount = c.i32();
    const sets = [];
    for (let s = 0; s < setCount; s++) {
      const itemCount = c.i32();
      const items = [];
      for (let i = 0; i < itemCount; i++) {
        const chance = c.i32();
        const itemId = c.chars(4);
        items.push({ itemId, chance });
      }
      sets.push(items);
    }
    randomItemTables.push({ id, name, sets });
  }

  if (c.offset !== buf.length) {
    throw new Error(`war3map.w3i: parsed ${c.offset} bytes but the file is ${buf.length} bytes`);
  }

  return { version, cameraBounds, complements, randomItemTables };
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
