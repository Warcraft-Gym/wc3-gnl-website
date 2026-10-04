/**
 * F001 (site-owns-replay-parser) parity proof: `parseReplay` + `extractBuild`
 * — the site's own copy, moved out of the overlay app byte-for-byte — must
 * still produce exactly the output recorded in `__fixtures__/golden/`
 * before the move (from the untouched overlay copy; see
 * `scripts/generate-replay-goldens.ts`'s docblock for the exact command).
 * A failure here means the copy or the site-local `EditorFormInput` swap
 * changed behaviour, not just location. Since then the goldens are
 * regenerated with that script for intended changes (building cancels as
 * "Cancel" steps), so they no longer match the overlay's copy.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseReplay } from "./parseReplay";
import { extractBuild } from "./extractBuild";

const FIXTURES_DIR = join(__dirname, "__fixtures__");
const GOLDEN_DIR = join(FIXTURES_DIR, "golden");

const goldenFiles = readdirSync(GOLDEN_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort();

describe("replay parser golden parity (C-011)", () => {
  it("has one golden file per .w3g fixture", () => {
    const fixtures = readdirSync(FIXTURES_DIR)
      .filter((f) => f.endsWith(".w3g"))
      .sort();
    expect(goldenFiles.length).toBe(fixtures.length);
    for (const fixture of fixtures) {
      expect(goldenFiles).toContain(`${fixture.replace(/\.w3g$/, "")}.json`);
    }
  });

  for (const goldenFile of goldenFiles) {
    const golden = JSON.parse(readFileSync(join(GOLDEN_DIR, goldenFile), "utf-8"));

    describe(golden.file, () => {
      it("parseReplay + extractBuild reproduce the committed golden for dropLikelyRejected: true and false", async () => {
        const bytes = new Uint8Array(readFileSync(join(FIXTURES_DIR, golden.file)));
        const summary = await parseReplay(bytes);

        expect(summary.map).toEqual(golden.map);
        expect(summary.version).toBe(golden.version);
        expect(summary.buildNumber).toBe(golden.buildNumber);
        expect(summary.durationMs).toBe(golden.durationMs);

        for (const dropLikelyRejected of [true, false]) {
          const actual = summary.players.map((p) => ({
            id: p.id,
            name: p.name,
            race: p.race,
            raceDetected: p.raceDetected,
            teamId: p.teamId,
            isObserver: p.isObserver,
            draft: extractBuild(summary, p.id, { dropLikelyRejected }),
          }));
          expect(actual).toEqual(golden.variants[String(dropLikelyRejected)]);
        }
      });
    });
  }
});
