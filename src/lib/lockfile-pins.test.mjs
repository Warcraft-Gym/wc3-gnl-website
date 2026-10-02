/**
 * `@sanity/ui` ships a 5.0.0-alpha.* line alongside its stable 4.x line.
 * `sanity` itself depends on the alpha line through an `npm:` dist-tag alias
 * (`"ui5": "npm:@sanity/ui@alpha"`), so a plain `pnpm install` that
 * re-resolves the lockfile keeps picking up whatever alpha build is newest
 * that day. This has drifted three times. The fix is a pnpm override
 * pinning that alias to one exact alpha build; this test fails the moment
 * either the pin in pnpm-workspace.yaml or its effect on the lockfile goes
 * missing, instead of waiting for someone to notice a diff later.
 *
 * It does not touch the stable `@sanity/ui@4.x` line used directly by
 * `@sanity/vision`, `@sanity/access-ui` and `@sanity/visual-editing` -
 * that one is unrelated to the drift and should keep resolving normally.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");

const PINNED_VERSION = "5.0.0-alpha.12";

function readLockfile() {
  return readFileSync(join(ROOT, "pnpm-lock.yaml"), "utf8");
}

function readWorkspaceYaml() {
  return readFileSync(join(ROOT, "pnpm-workspace.yaml"), "utf8");
}

test("pnpm-workspace.yaml pins the @sanity/ui alpha line to one exact version", () => {
  const yaml = readWorkspaceYaml();
  const overridesBlock = yaml.match(/^overrides:\n([\s\S]*?)(?:\n\S|$)/m);
  assert.ok(overridesBlock, "pnpm-workspace.yaml must have an `overrides:` block pinning @sanity/ui");
  const block = overridesBlock[1];
  assert.match(
    block,
    new RegExp(`@sanity/ui@${PINNED_VERSION.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
    `the overrides block must pin @sanity/ui to exactly ${PINNED_VERSION}`,
  );
});

test("the lockfile carries the same pin in its own overrides setting", () => {
  const lock = readLockfile();
  const overridesBlock = lock.match(/^overrides:\n([\s\S]*?)\n\S/m);
  assert.ok(overridesBlock, "pnpm-lock.yaml must record the overrides setting (run `pnpm install` after editing pnpm-workspace.yaml)");
  assert.match(
    overridesBlock[1],
    new RegExp(`@sanity/ui@${PINNED_VERSION.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
  );
});

test("no @sanity/ui@5.0.0-alpha.* entry other than the pinned build is in the lockfile", () => {
  const lock = readLockfile();
  // Matches top-level `packages:` keys like `'@sanity/ui@5.0.0-alpha.13':`
  // as well as the pinned-dependency snapshot lines like
  // `ui5: '@sanity/ui@5.0.0-alpha.13(...)'`. Deliberately does not match
  // the unrelated stable 4.x line (`@sanity/ui@4.0.6`, `@sanity/ui@4.3.0`, ...).
  const alphaEntries = lock.match(/@sanity\/ui@5\.0\.0-alpha\.\d+/g) ?? [];
  assert.ok(alphaEntries.length > 0, "expected to find at least one @sanity/ui 5.0.0-alpha entry in the lockfile");
  const stray = alphaEntries.filter((entry) => entry !== `@sanity/ui@${PINNED_VERSION}`);
  assert.deepEqual(
    [...new Set(stray)],
    [],
    `found @sanity/ui alpha build(s) other than the pinned ${PINNED_VERSION}: ${[...new Set(stray)].join(", ")}`,
  );
});
