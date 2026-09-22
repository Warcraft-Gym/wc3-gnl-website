import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { loadCreepTable, getCreep } from "./creeps.mjs";

test("every entry in creeps.json has a name, integer level 1-10, a source URL and an icon", () => {
  const table = loadCreepTable();
  assert.ok(Object.keys(table).length > 0);
  for (const [rawcode, entry] of Object.entries(table)) {
    assert.ok(entry.name && typeof entry.name === "string", `${rawcode} has no name`);
    assert.ok(
      Number.isInteger(entry.level) && entry.level >= 1 && entry.level <= 10,
      `${rawcode} has an invalid level: ${entry.level}`,
    );
    assert.ok(typeof entry.sleeps === "boolean", `${rawcode} has a non-boolean sleeps`);
    assert.ok(/^https:\/\//.test(entry.source), `${rawcode} has no https source: ${entry.source}`);
    assert.ok(entry.icon && /^BTN/.test(entry.icon), `${rawcode} has no BTN icon: ${entry.icon}`);
  }
});

test("an invented rawcode throws, naming the id", () => {
  const table = loadCreepTable();
  assert.throws(() => getCreep("zzzz", table), /zzzz/);
});

test("every rawcode used by a generated map catalogue exists in creeps.json", () => {
  const table = loadCreepTable();
  const mapsDir = fileURLToPath(new URL("./maps/", import.meta.url));
  let files;
  try {
    files = readdirSync(mapsDir).filter((f) => f.endsWith(".json"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    files = [];
  }

  for (const file of files) {
    const catalogue = JSON.parse(readFileSync(join(mapsDir, file), "utf8"));
    for (const camp of catalogue.camps) {
      for (const creep of camp.creeps) {
        assert.doesNotThrow(
          () => getCreep(creep.id, table),
          `${file}: camp ${camp.id} uses unsourced creep ${creep.id}`,
        );
      }
    }
  }
});
