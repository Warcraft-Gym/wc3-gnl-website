import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCreepMapDoc } from "./publish-doc.mjs";

function catalogue(overrides = {}) {
  return {
    name: "Autumn Leaves v2",
    w3cMapId: 44,
    mapVersion: "2.0",
    sourceFile: "w3c_AutumnLeaves_v2-0.w3x",
    generatedAt: "2026-08-01T00:00:00Z",
    bounds: { xMin: -6272, xMax: 6272, yMin: -6272, yMax: 6272 },
    terrainBounds: { xMin: -6400, xMax: 6400, yMin: -6400, yMax: 6400 },
    cameraBounds: [-6400, -6400, -6400, 6400, 6400, 6400, 6400, -6400],
    image: { width: 256, height: 256 },
    camps: [{ id: "c01", x: 0.1, y: 0.2, level: 5, band: "easy", creeps: [] }],
    starts: [{ player: 0, x: 0.1, y: 0.1 }],
    mines: [{ x: 0.5, y: 0.5, gold: 12500 }],
    shops: [{ id: "ntav-16", x: 0.3, y: 0.3 }],
    ...overrides,
  };
}

test("builds a document with the deterministic creepMap.<slug> id", () => {
  const doc = buildCreepMapDoc("autumn-leaves", catalogue(), "image-abc123");
  assert.equal(doc._id, "creepMap.autumn-leaves");
  assert.equal(doc._type, "creepMap");
  assert.deepEqual(doc.slug, { _type: "slug", current: "autumn-leaves" });
});

test("includes terrainBounds and cameraBounds straight from the catalogue (code-a.md gap)", () => {
  const doc = buildCreepMapDoc("autumn-leaves", catalogue(), "image-abc123");
  assert.deepEqual(doc.terrainBounds, { xMin: -6400, xMax: 6400, yMin: -6400, yMax: 6400 });
  assert.deepEqual(doc.cameraBounds, [-6400, -6400, -6400, 6400, 6400, 6400, 6400, -6400]);
});

test("omits terrainBounds/cameraBounds when the catalogue doesn't have them", () => {
  const c = catalogue();
  delete c.terrainBounds;
  delete c.cameraBounds;
  const doc = buildCreepMapDoc("autumn-leaves", c, "image-abc123");
  assert.equal(doc.terrainBounds, undefined);
  assert.equal(doc.cameraBounds, undefined);
});

test("references the uploaded minimap asset by id", () => {
  const doc = buildCreepMapDoc("autumn-leaves", catalogue(), "image-abc123");
  assert.deepEqual(doc.minimap, {
    _type: "image",
    asset: { _type: "reference", _ref: "image-abc123" },
  });
});

test("keys array members deterministically (camp id, start/mine index, shop id)", () => {
  const doc = buildCreepMapDoc("autumn-leaves", catalogue(), "image-abc123");
  assert.equal(doc.camps[0]._key, "c01");
  assert.equal(doc.starts[0]._key, "start-0");
  assert.equal(doc.mines[0]._key, "mine-0");
  assert.equal(doc.shops[0]._key, "ntav-16");
});

test("carries w3cMapId, mapVersion, sourceFile, generatedAt straight through", () => {
  const doc = buildCreepMapDoc("autumn-leaves", catalogue(), "image-abc123");
  assert.equal(doc.w3cMapId, 44);
  assert.equal(doc.mapVersion, "2.0");
  assert.equal(doc.sourceFile, "w3c_AutumnLeaves_v2-0.w3x");
  assert.equal(doc.generatedAt, "2026-08-01T00:00:00Z");
});

test("F011: keys creeps[] and drops[]/drops[].items[] all the way down", () => {
  const c = catalogue({
    camps: [
      {
        id: "c01",
        x: 0.1,
        y: 0.2,
        level: 5,
        band: "easy",
        creeps: [{ id: "nftt", name: "Forest Troll Trapper", level: 3, count: 1, icon: "BTNForestTrollTrapper" }],
        drops: [
          {
            kind: "class",
            class: "Permanent",
            level: 2,
            chance: 100,
            items: [{ id: "clsd", name: "Cloak of Shadows", icon: "BTNCloak" }],
          },
          { kind: "item", id: "ckng", chance: 50, items: [{ id: "ckng", name: "Crown of Kings +5", icon: "BTNHelmutPurple" }] },
        ],
      },
    ],
  });
  const doc = buildCreepMapDoc("autumn-leaves", c, "image-abc123");
  const [camp] = doc.camps;
  assert.equal(camp.creeps[0]._type, "creep");
  assert.equal(camp.creeps[0]._key, "nftt");
  assert.equal(camp.drops[0]._type, "drop");
  assert.equal(camp.drops[0]._key, "Permanent-2");
  assert.equal(camp.drops[0].items[0]._type, "dropItem");
  assert.equal(camp.drops[0].items[0]._key, "clsd");
  assert.equal(camp.drops[1]._key, "ckng");
});
