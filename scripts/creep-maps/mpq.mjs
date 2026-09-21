/** Opens a `.w3x`/`.w3m` file and reads the MPQ member files a catalogue needs.
 *
 * A `.w3x` is a 512-byte `HM3W` header glued to an MPQ archive; `mopaq` reads
 * that combination directly. We check the magic ourselves first so a file
 * that is not a Warcraft III map fails with a message naming the reason
 * (HM3W header missing) instead of whatever mopaq happens to say about the
 * bytes after it.
 */
import { readFileSync, existsSync } from "node:fs";
import { Archive } from "mopaq";

const HM3W_MAGIC = "HM3W";

/** Reads `path` and opens it as a Warcraft III map archive.
 *
 * Throws a one-line `Error` naming `path` if the file does not exist, and an
 * `Error` mentioning "HM3W" or "MPQ" if it exists but is not a map.
 */
export function openMap(path) {
  if (!existsSync(path)) {
    throw new Error(`map file not found: ${path}`);
  }
  const buffer = readFileSync(path);
  const magic = buffer.subarray(0, 4).toString("latin1");
  if (magic !== HM3W_MAGIC) {
    throw new Error(`not a Warcraft III map, missing HM3W header: ${path}`);
  }
  try {
    const archive = Archive.open(buffer);
    return { path, files: archive.files(), read: (name) => archive.readFile(name) };
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
