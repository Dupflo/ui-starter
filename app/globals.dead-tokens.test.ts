import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// s10-defect-sweep F4 — docs/design-system.md § "Hors périmètre" says these
// CV-artifact leftovers are NOT recreated in @theme, but they were still
// present. Per finding F4: delete the dead CSS (confirmed via `git grep` —
// no consumer outside globals.css itself), don't soften the doc. `cat-sector*`
// is kept — components/ui/badge.tsx's `info` tone consumes it.

const cssPath = fileURLToPath(new URL("./globals.css", import.meta.url))
const css = readFileSync(cssPath, "utf8")

describe("app/globals.css — s10-defect-sweep F4: dead CV-artifact tokens removed", () => {
  it("does not declare --font-serif or --font-read (CV artifact faces, no consumer)", () => {
    expect(css).not.toMatch(/--font-serif\s*:/)
    expect(css).not.toMatch(/--font-read\s*:/)
  })

  it("does not declare cat-tools or cat-people category colours (CV artifact, no consumer)", () => {
    expect(css).not.toMatch(/--color-cat-tools/)
    expect(css).not.toMatch(/--color-cat-people/)
  })

  it("keeps --color-cat-sector* — components/ui/badge.tsx's `info` tone consumes it", () => {
    expect(css).toMatch(/--color-cat-sector\s*:/)
    expect(css).toMatch(/--color-cat-sector-soft\s*:/)
  })

  it("does not declare the ob-* onboarding keyframes/classes (CV-flow decoration, no consumer)", () => {
    expect(css).not.toMatch(/@keyframes ob-/)
    expect(css).not.toMatch(/\.ob-(doc|dash|dot|pulse|mark)\b/)
  })
})
