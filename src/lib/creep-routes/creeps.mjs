/** The sourced creep table: rawcode → `{ name, level, sleeps, source, icon
 * }`.
 *
 * Every entry must carry a `source` URL and an `icon` (F011: `"BTN<Name>"`,
 * see `creep-table.mjs`'s `--func`) — see `creeps.json` and the feature
 * README for where the numbers come from. An id missing from the table is
 * never guessed: `getCreep` throws, naming the id, so a new map fails
 * loudly instead of shipping an unsourced level or a missing icon.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TABLE_PATH = fileURLToPath(new URL("./creeps.json", import.meta.url));

/** Loads and parses `creeps.json`. */
export function loadCreepTable(path = TABLE_PATH) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Looks up `rawcode` in `table` (as returned by `loadCreepTable`).
 * Throws an `Error` naming `rawcode` if it is not in the table, or if the
 * entry is missing a name, an integer level 1-10, or a source URL. */
export function getCreep(rawcode, table) {
  const entry = table[rawcode];
  if (!entry) {
    throw new Error(`unknown creep rawcode: ${rawcode} (add it to creeps.json with a source)`);
  }
  if (!entry.name || typeof entry.name !== "string") {
    throw new Error(`creep ${rawcode} has no name in creeps.json`);
  }
  if (!Number.isInteger(entry.level) || entry.level < 1 || entry.level > 10) {
    throw new Error(`creep ${rawcode} has an invalid level in creeps.json: ${entry.level}`);
  }
  if (!entry.source || typeof entry.source !== "string") {
    throw new Error(`creep ${rawcode} has no source URL in creeps.json`);
  }
  if (!entry.icon || typeof entry.icon !== "string") {
    throw new Error(`creep ${rawcode} has no icon in creeps.json`);
  }
  return entry;
}
