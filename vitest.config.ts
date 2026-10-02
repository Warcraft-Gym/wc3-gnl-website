import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * F001 (site-owns-replay-parser): scoped to `src/lib/replay` only, so this
 * suite doesn't collect the `node --test` `.test.mjs` suites that make up
 * the rest of the site's tests (see `package.json`'s `test` script, which
 * runs both).
 *
 * F009 (site-polish): deliberately widened to also pick up
 * `src/components/**\/*.test.tsx` component tests (jsdom + Testing
 * Library), run in the jsdom environment via `environmentMatchGlobs` so the
 * `src/lib/replay` suite above keeps its plain `node` environment. The `@/`
 * alias those components import with needs a real resolver here, since
 * vitest doesn't read `tsconfig.json` `paths` on its own.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["src/lib/replay/**/*.test.ts", "src/components/**/*.test.tsx"],
    environment: "node",
    environmentMatchGlobs: [["src/components/**/*.test.tsx", "jsdom"]],
    setupFiles: ["./src/test/setup-jsdom.ts"],
    // These tests parse real .w3g replay files and can exceed vitest's 5s
    // default under full-suite load (seen flaking on extractBuild.test.ts).
    testTimeout: 20000,
  },
});
