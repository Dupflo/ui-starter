import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { describe, it, expect } from "vitest"

// s10-defect-sweep F4 — § "Hors périmètre" listed `font-serif`/`font-read` +
// "leurs @import" as not recreated in @theme, but no font in this file has a
// remote @import any more (T6: fonts are self-hosted via next/font). That
// phrase is stale regardless of which tokens exist. Fixed alongside deleting
// the dead CSS itself (app/globals.dead-tokens.test.ts).

const doc = readFileSync(
  path.join(fileURLToPath(new URL(".", import.meta.url)), "design-system.md"),
  "utf8",
)

describe("docs/design-system.md — s10-defect-sweep F4: no stale '@import' mention", () => {
  it('Hors périmètre no longer claims serif fonts have "leurs @import" (none exist — fonts are self-hosted via next/font)', () => {
    expect(
      doc,
      'docs/design-system.md must not say "leurs @import" for font-serif/font-read — no font in this repo is loaded via @import any more (T6: next/font, self-hosted)',
    ).not.toMatch(/leurs `@import`/)
  })
})
