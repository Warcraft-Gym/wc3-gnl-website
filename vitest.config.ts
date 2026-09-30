import { defineConfig } from "vitest/config";

/**
 * F001 (site-owns-replay-parser): scoped to `src/lib/replay` only, so this
 * suite doesn't collect the `node --test` `.test.mjs` suites that make up
 * the rest of the site's tests (see `package.json`'s `test` script, which
 * runs both).
 */
export default defineConfig({
  test: {
    include: ["src/lib/replay/**/*.test.ts"],
    environment: "node",
    // These tests parse real .w3g replay files and can exceed vitest's 5s
    // default under full-suite load (seen flaking on extractBuild.test.ts).
    testTimeout: 20000,
  },
});
