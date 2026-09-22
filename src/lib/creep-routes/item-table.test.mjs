import assert from "node:assert/strict";
import test from "node:test";
import { idsFromCatalogues, buildItemsTable } from "../../../scripts/creep-maps/item-table.mjs";

function itemdataIndex(rows) {
  return new Map(rows.map((r) => [r.itemID, r]));
}

test("idsFromCatalogues unions concrete ids and pool-expanded ids across catalogues", () => {
  const index = itemdataIndex([
    { itemID: "clsd", class: "Permanent", Level: "1", pickRandom: "1" },
    { itemID: "afac", class: "Permanent", Level: "1", pickRandom: "1" },
    { itemID: "ckng", class: "Artifact", Level: "7", pickRandom: "1" },
  ]);
  const catalogues = [
    {
      camps: [
        { drops: [{ kind: "class", class: "Permanent", level: 1, chance: 50 }] },
        { drops: [{ kind: "item", id: "ckng", chance: 10 }] },
      ],
    },
    { camps: [{ drops: [] }, { drops: undefined }] },
    {},
  ];
  const ids = idsFromCatalogues(catalogues, index);
  assert.deepEqual([...ids].sort(), ["afac", "ckng", "clsd"]);
});

test("buildItemsTable resolves name/class/level/icon and sorts", () => {
  const names = new Map([
    ["afac", "Amulet of Recall"],
    ["clsd", "Cloak of Shadows"],
  ]);
  const arts = new Map([
    ["afac", "ReplaceableTextures\\CommandButtons\\BTNAmulet.blp"],
    ["clsd", "ReplaceableTextures\\CommandButtons\\BTNCloak.blp"],
  ]);
  const itemdataIndex = new Map([
    ["afac", { class: "Permanent", Level: "1" }],
    ["clsd", { class: "Permanent", Level: "1" }],
  ]);
  const table = buildItemsTable(new Set(["clsd", "afac"]), { names, arts, itemdataIndex });
  assert.deepEqual(Object.keys(table), ["afac", "clsd"]);
  assert.deepEqual(table.afac, { name: "Amulet of Recall", class: "Permanent", level: 1, icon: "BTNAmulet" });
  assert.deepEqual(table.clsd, { name: "Cloak of Shadows", class: "Permanent", level: 1, icon: "BTNCloak" });
});

test("buildItemsTable throws naming every id missing a name, art or itemdata record", () => {
  const names = new Map([["clsd", "Cloak of Shadows"]]);
  const arts = new Map([["clsd", "ReplaceableTextures\\CommandButtons\\BTNCloak.blp"]]);
  const itemdataIndex = new Map([["clsd", { class: "Permanent", Level: "1" }]]);
  assert.throws(
    () => buildItemsTable(new Set(["clsd", "zzzz"]), { names, arts, itemdataIndex }),
    /zzzz/,
  );
});
