import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// T6 (s10-defect-sweep) — see app/fonts/index.test.ts for the full rationale.
// This pins the @theme side: the design tokens must resolve through the
// next/font-loaded CSS variables instead of a remote @import that never
// survived the build.

const cssPath = fileURLToPath(new URL("./globals.css", import.meta.url))
const css = readFileSync(cssPath, "utf8")

describe("app/globals.css — fonts resolve to self-hosted next/font vars (s10-defect-sweep T6)", () => {
  it("has no remote @import for webfonts (Fontshare or Google Fonts)", () => {
    expect(css).not.toMatch(/@import\s+url\(["']?https?:\/\//)
  })

  it("no @import fetches Fraunces or Newsreader (CV-era faces, no consumer)", () => {
    const importLines = css
      .split("\n")
      .filter((line) => line.trim().startsWith("@import"))
      .join("\n")
    expect(importLines).not.toMatch(/Fraunces/)
    expect(importLines).not.toMatch(/Newsreader/)
  })

  it("--font-display resolves through the loaded Plus Jakarta Sans variable", () => {
    expect(css).toMatch(
      /--font-display:\s*var\(--font-plus-jakarta-sans\)[^;]*;/,
    )
  })

  it("--font-ui resolves through the loaded Geist variable", () => {
    expect(css).toMatch(/--font-ui:\s*var\(--font-geist\)[^;]*;/)
  })

  it("--font-mono resolves through the loaded Geist Mono variable", () => {
    expect(css).toMatch(/--font-mono:\s*var\(--font-geist-mono\)[^;]*;/)
  })
})

// ─── s10-defect-sweep F3: stale "General Sans" prose ───────────────────────
//
// T6 replaced General Sans with Plus Jakarta Sans (licence: FFL forbids the
// distribution channel/format changes a forkable starter needs — see
// app/fonts/index.test.ts). globals.css:10 still named the old face.

describe("app/globals.css — s10-defect-sweep F3: no stale General Sans prose", () => {
  it("does not name General Sans in the file header prose", () => {
    expect(
      css,
      'globals.css prose must not still say "General Sans" — T6 replaced it with Plus Jakarta Sans (FFL licence conflict, see app/fonts/index.test.ts)',
    ).not.toMatch(/General Sans/)
  })

  it("names Plus Jakarta Sans in the file header prose instead", () => {
    expect(
      css,
      "globals.css prose should name the font actually loaded (Plus Jakarta Sans)",
    ).toMatch(/Plus Jakarta Sans/)
  })
})
