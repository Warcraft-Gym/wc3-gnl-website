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
