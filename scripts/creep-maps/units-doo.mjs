/** Parses `war3mapUnits.doo`: the placed-unit list a map ships in its MPQ.
 *
 * Format verified against real files (see the feature spec): `W3do`, an
 * `int32` version, a "sub-version" block whose header carries its own
 * version, then that many units. Every field is little-endian; unit ids
 * (`typeId`, `skinId`, ability/item ids) are 4-byte chars, not numbers.
 *
 * `player === 24` is neutral hostile (creeps), `player === 27` is neutral
 * passive (shops, mine-adjacent decor), `typeId === "sloc"` is a start
 * location and `typeId === "ngol"` a gold mine.
 *
 * F011: `itemTablePointer`/`droppedItemSets` (a unit's inline drop table)
 * are kept, not discarded — see `drops.mjs`'s `campDrops`.
 */

class Cursor {
  #buf;
  #view;
  offset = 0;

  constructor(buffer) {
    this.#buf = buffer;
    this.#view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }

  get length() {
    return this.#buf.length;
  }

  char4() {
    const s = this.#buf.toString("latin1", this.offset, this.offset + 4);
    this.offset += 4;
    return s;
  }

  int32() {
    const v = this.#view.getInt32(this.offset, true);
    this.offset += 4;
    return v;
  }

  uint32() {
    const v = this.#view.getUint32(this.offset, true);
    this.offset += 4;
    return v;
  }

  float32() {
    const v = this.#view.getFloat32(this.offset, true);
    this.offset += 4;
    return v;
  }

  byte() {
    const v = this.#view.getUint8(this.offset);
    this.offset += 1;
    return v;
  }
}

/** Parses a `war3mapUnits.doo` buffer into `{ version, subversion, units }`. */
export function parseUnitsDoo(input) {
  const buffer = Buffer.isBuffer(input)
    ? input
    : Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  const c = new Cursor(buffer);

  const magic = c.char4();
  if (magic !== "W3do") {
    throw new Error(`war3mapUnits.doo has the wrong magic: ${magic}`);
  }
  const version = c.int32();
  const subversion = c.int32();
  const unitCount = c.int32();

  const units = [];
  for (let i = 0; i < unitCount; i++) {
    units.push(readUnit(c, version, subversion));
  }

  if (c.offset !== c.length) {
    throw new Error(
      `war3mapUnits.doo: parsed ${c.offset} bytes but the file is ${c.length} bytes`,
    );
  }

  return { version, subversion, units };
}

function readUnit(c, version, subversion) {
  const typeId = c.char4();
  const variation = c.int32();
  const x = c.float32();
  const y = c.float32();
  const z = c.float32();
  const angle = c.float32();
  const scaleX = c.float32();
  const scaleY = c.float32();
  const scaleZ = c.float32();

  let skinId = typeId;
  if (version >= 8) {
    skinId = c.char4();
  }

  c.byte(); // flags
  const player = c.int32();
  c.byte();
  c.byte();
  const hp = c.int32();
  const mp = c.int32();

  // -1 = this unit has no map-level random item table assigned (F011: a
  // pointer into war3map.w3i's random item tables, see map-info.mjs's
  // parseW3i — resolved by drops.mjs's campDrops, not here).
  let itemTablePointer = -1;
  if (subversion >= 11) {
    itemTablePointer = c.int32();
  }

  // F011: kept (was parsed and discarded) — a unit's own inline drop table.
  // Each set is one roll the game makes when the unit dies; `items` are the
  // (itemId, chance) options within that roll. `itemId` is a concrete 4-char
  // item code (e.g. "ckng") or a random-pool pseudo-code ("YiI3" = Permanent
  // level 3) — see drops.mjs's `classifyItemId`.
  const droppedItemSetCount = c.int32();
  const droppedItemSets = [];
  for (let s = 0; s < droppedItemSetCount; s++) {
    const itemCount = c.int32();
    const items = [];
    for (let it = 0; it < itemCount; it++) {
      const itemId = c.char4();
      const chance = c.int32();
      items.push({ itemId, chance });
    }
    droppedItemSets.push({ items });
  }

  const gold = c.int32();
  c.float32(); // targetAcquisition
  const heroLevel = c.int32();

  if (subversion >= 11) {
    c.int32(); // strength
    c.int32(); // agility
    c.int32(); // intelligence
  }

  const inventoryCount = c.int32();
  for (let i = 0; i < inventoryCount; i++) {
    c.int32(); // slot
    c.char4(); // itemId
  }

  const abilityCount = c.int32();
  for (let i = 0; i < abilityCount; i++) {
    c.char4(); // abilityId
    c.int32(); // autocast
    c.int32(); // level
  }

  const randomFlag = c.int32();
  if (randomFlag === -1) {
    // Not a random-unit table entry (a specific, fixed unit): no extra bytes.
  } else if (randomFlag === 0) {
    c.byte();
    c.byte();
    c.byte();
    c.byte(); // level[3] + itemClass
  } else if (randomFlag === 1) {
    c.int32(); // group
    c.int32(); // position
  } else if (randomFlag === 2) {
    const n = c.int32();
    for (let i = 0; i < n; i++) {
      c.char4(); // id
      c.int32(); // chance
    }
  } else {
    throw new Error(`war3mapUnits.doo: unknown random item flag ${randomFlag}`);
  }

  const customColor = c.int32();
  const waygate = c.int32();
  const creationNumber = c.int32();

  return {
    typeId,
    skinId,
    variation,
    x,
    y,
    z,
    angle,
    scaleX,
    scaleY,
    scaleZ,
    player,
    hp,
    mp,
    gold,
    heroLevel,
    itemTablePointer,
    droppedItemSets,
    customColor,
    waygate,
    creationNumber,
  };
}
