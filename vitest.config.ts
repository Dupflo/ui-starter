import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

// Résout l'alias `@/` (tsconfig paths) pour les tests, comme Next le fait au build.
const root = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
  test: {
    // `next.config.demo-flag.test.ts` runs a REAL `next build` and wipes
    // `.next` — 7 s, and it pulls the rug from under a running `npm run dev`.
    // `npm run test` must stay fast and side-effect-free, so it is excluded
    // here and run by `npm run test:build` instead. Anything wiring up CI
    // must call BOTH scripts, or the T8 regression goes unguarded.
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      // Excluded from the default run, included when `npm run test:build` sets
      // the flag — a plain CLI filter cannot re-include an excluded file.
      ...(process.env.VITEST_INCLUDE_BUILD
        ? []
        : ["next.config.demo-flag.test.ts"]),
    ],
  },
  resolve: {
    alias: [
      { find: /^@\//, replacement: root },
      // `server-only`/`client-only` lèvent à l'import hors bundle Next : on les
      // neutralise pour pouvoir tester les modules serveur purs (mapping, markdown).
      { find: /^server-only$/, replacement: `${root}test/stubs/empty.ts` },
      { find: /^client-only$/, replacement: `${root}test/stubs/empty.ts` },
    ],
  },
})
