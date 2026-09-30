#!/usr/bin/env -S pnpm exec tsx
/**
 * F001 (site-owns-replay-parser): regenerates the replay-parser golden
 * fixtures by running `parseReplay` + `extractBuild` against every `.w3g`
 * in a replay folder's `__fixtures__/`, for both `dropLikelyRejected`
 * values, and writing one JSON file per fixture.
 *
 * This is the parity proof for the F001 move: the parser folder is
 * copyable to a different location, and re-running this script against
 * either copy must reproduce byte-identical goldens, because neither
 * `parseReplay` nor `extractBuild` reads anything outside the replay
 * folder (no Date.now()/Math.random(), see the feature's handoff).
 *
 * Usage:
 *   pnpm exec tsx scripts/generate-replay-goldens.ts [replayDir] [outDir]
 *
 *   replayDir  Folder containing parseReplay.ts/extractBuild.ts and a
 *              __fixtures__/ subfolder of .w3g files. Relative to the repo
 *              root. Default: src/lib/replay (the site's copy).
 *   outDir     Where to write <fixture>.json. Default:
 *              <replayDir>/__fixtures__/golden.
 *
 * Examples:
 *   # Captured BEFORE the F001 move, from the untouched overlay copy —
 *   # this is the exact command used to produce the committed goldens:
 *   pnpm exec tsx scripts/generate-replay-goldens.ts apps/overlay/src/replay src/lib/replay/__fixtures__/golden
 *
 *   # Parity check AFTER the move (default args), diffed against git:
 *   pnpm exec tsx scripts/generate-replay-goldens.ts
 *   git diff --stat -- src/lib/replay/__fixtures__/golden
 *
 *   # Re-verify at any other commit by pointing at wherever that commit's
 *   # parser lives (still apps/overlay/src/replay before F001 lands):
 *   pnpm exec tsx scripts/generate-replay-goldens.ts apps/overlay/src/replay /tmp/goldens-base
 *   diff -r /tmp/goldens-base src/lib/replay/__fixtures__/golden
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const replayDirArg = process.argv[2] ?? "src/lib/replay";
const replayDir = resolve(ROOT, replayDirArg);
const outDir = resolve(ROOT, process.argv[3] ?? join(replayDirArg, "__fixtures__/golden"));
const fixturesDir = join(replayDir, "__fixtures__");

if (!existsSync(fixturesDir)) {
  console.error(`No __fixtures__ folder at ${fixturesDir}`);
  process.exit(1);
}

async function main() {
  const { parseReplay } = await import(pathToFileURL(join(replayDir, "parseReplay.ts")).href);
  const { extractBuild } = await import(pathToFileURL(join(replayDir, "extractBuild.ts")).href);

  mkdirSync(outDir, { recursive: true });

  const fixtures = readdirSync(fixturesDir)
    .filter((f) => f.endsWith(".w3g"))
    .sort();

  if (fixtures.length === 0) {
    console.error(`No .w3g fixtures found in ${fixturesDir}`);
    process.exit(1);
  }

  for (const file of fixtures) {
    const bytes = new Uint8Array(readFileSync(join(fixturesDir, file)));
    const summary = await parseReplay(bytes);

    const variants: Record<string, unknown> = {};
    for (const dropLikelyRejected of [true, false]) {
      variants[String(dropLikelyRejected)] = summary.players.map(
        (p: { id: number; name: string; race: string; raceDetected: string; teamId: number; isObserver: boolean }) => ({
          id: p.id,
          name: p.name,
          race: p.race,
          raceDetected: p.raceDetected,
          teamId: p.teamId,
          isObserver: p.isObserver,
          draft: extractBuild(summary, p.id, { dropLikelyRejected }),
        }),
      );
    }

    const golden = {
      file,
      map: summary.map,
      version: summary.version,
      buildNumber: summary.buildNumber,
      durationMs: summary.durationMs,
      variants,
    };

    const outFile = join(outDir, `${basename(file, ".w3g")}.json`);
    writeFileSync(outFile, JSON.stringify(golden, null, 2) + "\n");
    console.log(`wrote ${outFile}`);
  }
}

main();
