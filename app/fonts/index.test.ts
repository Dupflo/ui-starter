import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { describe, it, expect } from "vitest"

// T6 (s10-defect-sweep) — the two remote `@import url(...)` in globals.css never
// survived the build (0 @font-face, 0 @import in the emitted stylesheet, no
// .next/static/media — see docs/research/s10-defect-sweep.md). Decision: load
// fonts for real via next/font, self-hosted, keeping the design-system token
// names (font-display, font-ui, font-mono).
//
// General Sans (Fontshare, ITF Free Font License) was tried first via
// next/font/local, then reverted: FFL clause 02 explicitly names "repository"
// among the forbidden distribution channels for the raw Font Software files,
// and clause 01 forbids the subsetting/format conversion next/font/local
// performs — a starter meant to be forked is exactly the prohibited case.
// Replaced with Plus Jakarta Sans (OFL, on Google Fonts — next/font/google
// self-hosts it at build time with no licence conflict: nothing is committed).
//
// next/font/google only works inside Next's own compiler (its package entry
// point is empty — the real codegen is a bundler-level transform). It cannot
// be imported and executed here, so this is a source-level test, like the
// other Server-Component-only checks in this repo (see app/[locale]/page.test.ts).
// The authoritative proof is the emitted stylesheet + .next/static/media after
// `npm run build` (checked manually during implementation, reported in the
// story summary).

const dir = fileURLToPath(new URL(".", import.meta.url))
const source = readFileSync(path.join(dir, "index.ts"), "utf8")

describe("app/fonts/index.ts — self-hosted fonts (s10-defect-sweep T6)", () => {
  it("loads Plus Jakarta Sans, Geist and Geist Mono via next/font/google", () => {
    expect(source).toMatch(
      /import\s*\{[^}]*\bGeist\b[^}]*\bGeist_Mono\b[^}]*\bPlus_Jakarta_Sans\b[^}]*\}\s*from\s*["']next\/font\/google["']/,
    )
  })

  it("does not import next/font/local or reference a committed font binary (licence: nothing self-hosted may be committed)", () => {
    expect(source).not.toMatch(/from\s*["']next\/font\/local["']/)
    expect(source).not.toMatch(/path:\s*["'][^"']*\.woff2?["']/)
  })

  it("exposes CSS variables consumed by the font-display/font-ui/font-mono tokens", () => {
    expect(source).toMatch(/variable:\s*["']--font-plus-jakarta-sans["']/)
    expect(source).toMatch(/variable:\s*["']--font-geist["']/)
    expect(source).toMatch(/variable:\s*["']--font-geist-mono["']/)
  })

  it("loads the weights the design system asks of font-display (500/600/700)", () => {
    const match = source.match(/Plus_Jakarta_Sans\(\{([\s\S]*?)\n\}\)/)?.[1]
    expect(match, "Plus_Jakarta_Sans({...}) call not found").toBeTruthy()
    for (const weight of ["500", "600", "700"]) {
      expect(match).toMatch(new RegExp(`["']${weight}["']`))
    }
  })
})
