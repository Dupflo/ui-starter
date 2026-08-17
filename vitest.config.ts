import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

// Résout l'alias `@/` (tsconfig paths) pour les tests, comme Next le fait au build.
const root = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
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
