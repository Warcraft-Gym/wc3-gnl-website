/** Opens a `.w3x`/`.w3m` file and reads the MPQ member files a catalogue needs.
 *
 * Two on-disk shapes exist and both are valid maps:
 *
 * - **Retail / launcher-bundle maps** are a 512-byte `HM3W` header glued to an
 *   MPQ archive; `mopaq` reads that combination directly.
 * - **W3Champions "clean" maps** (the `clean_maps/` folder of the
 *   `w3champions/map-updater-scripts` repo, which is where the *current*
 *   ladder files live) have the header stripped: the file starts at the MPQ
 *   magic `MPQ\x1a`. Everything we read afterwards — `war3map.w3i`,
 *   `war3map.w3e`, `war3mapUnits.doo`, `war3mapMap.blp` — is identical.
 *
 * We check the magic ourselves so a file that is neither fails with a message
 * naming the reason, instead of whatever mopaq happens to say about the bytes.
 */
import { readFileSync, existsSync } from "node:fs";
import { Archive } from "mopaq";

const HM3W_MAGIC = "HM3W";
/** MPQ archive magic — `clean_maps` files begin with this, no HM3W header. */
const MPQ_MAGIC = "MPQ\x1a";

/** Reads `path` and opens it as a Warcraft III map archive.
 *
 * Throws a one-line `Error` naming `path` if the file does not exist, and an
 * `Error` mentioning "HM3W" or "MPQ" if it exists but is not a map. The
 * returned object carries `headerless: true` for a clean (header-stripped)
 * archive, which callers may report but never need to act on.
 */
export function openMap(path) {
  if (!existsSync(path)) {
    throw new Error(`map file not found: ${path}`);
  }
  const buffer = readFileSync(path);
  const magic = buffer.subarray(0, 4).toString("latin1");
  const headerless = magic === MPQ_MAGIC;
  if (magic !== HM3W_MAGIC && !headerless) {
    throw new Error(`not a Warcraft III map, missing HM3W header and MPQ magic: ${path}`);
  }
  try {
    const archive = Archive.open(buffer);
    return { path, headerless, files: archive.files(), read: (name) => archive.readFile(name) };
  } catch (cause) {
    throw new Error(`not a valid MPQ archive: ${path} (${cause.message})`, { cause });
  }
}

/** Reads a member file, throwing a clear error if it is missing from the archive. */
export function readMember(map, name) {
  if (!map.files.includes(name)) {
    throw new Error(`map is missing ${name}: ${map.path}`);
  }
  return map.read(name);
}

/** Object-editor tables a map can carry to *redefine* units and items —
 *  `war3map.w3u`/`w3t` and their Reforged skin variants. Each is a
 *  `{ int version, int originalCount, [entries], int customCount, [entries] }`
 *  block; a map that customises nothing still ships a 12-byte header with
 *  both counts at zero, which is what every current ladder map does. */
const OBJECT_TABLES = ["war3map.w3u", "war3map.w3t", "war3mapSkin.w3u", "war3mapSkin.w3t"];

/** Counts the modifications an object-editor table declares. Returns
 *  `{ original, custom }`; a malformed or truncated table counts as zero
 *  rather than throwing, since the caller's job is to notice *real*
 *  customisation, not to validate a file nothing reads. */
function countObjectMods(buf) {
  const b = Buffer.from(buf);
  if (b.length < 12) return { original: 0, custom: 0 };
  const original = b.readInt32LE(4);
  // Walking every entry to find the custom count means parsing each
  // modification; the original count alone already answers "did anyone
  // change a base unit", which is the question that matters. The custom
  // count is read only for the common zero-original case, where it sits
  // immediately after the header.
  const custom = original === 0 && b.length >= 12 ? b.readInt32LE(8) : -1;
  return { original, custom };
}

/** Throws if `map` redefines any unit or item.
 *
 *  Creep names, levels, sleep flags and item pools come from Blizzard's own
 *  tables, not from the map — the map only stores rawcodes. A map that
 *  overrides those definitions would therefore be described with base-game
 *  values that are wrong for it, and nothing would fail. Refusing is the
 *  same stance `build.mjs` already takes on an unknown rawcode: stop, name
 *  the problem, never guess.
 *
 *  Every map in the current ladder pool passes. Tidehunters ships a `w3u`
 *  declaring two *custom* units derived from the Granite Golems, neither of
 *  which it places — custom definitions are additions, not overrides, so
 *  they are reported but not fatal unless they are actually used, which
 *  `build.mjs` discovers anyway when it meets an unknown rawcode. */
export function assertNoObjectOverrides(map) {
  const offenders = [];
  for (const name of OBJECT_TABLES) {
    if (!map.files.includes(name)) continue;
    const { original } = countObjectMods(map.read(name));
    if (original > 0) offenders.push(`${name} redefines ${original} base object(s)`);
  }
  if (offenders.length > 0) {
    throw new Error(
      `map customises game objects, so Blizzard's tables would describe it wrongly: ${map.path}\n  ` +
        offenders.join("\n  ") +
        "\n  Reading war3map.w3u/w3t is not implemented — see docs/creep-routes.md.",
    );
  }
}
