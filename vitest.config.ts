import { defineConfig } from "vitest/config";

/**
 * F001 (site-owns-replay-parser): scoped to `src/lib/replay` only, so this
 * suite doesn't collect the `node --test` `.test.mjs` suites that make up
 * the rest of the site's tests (see `package.json`'s `test` script, which
 * runs both). `apps/overlay` keeps its own Vite-driven vitest config;
 * unrelated to this one.
 */
export default defineConfig({
  test: {
    include: ["src/lib/replay/**/*.test.ts"],
    environment: "node",
  },
});
