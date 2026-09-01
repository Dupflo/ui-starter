import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// s15-gallery-feedback (follow-up) — Button's outline/ghost variants
// rendered invisible in the gallery (text-paper on the preview row's
// bg-paper). The fix must DERIVE which variants need a surface patch from
// the variants table itself (`isInvisibleOnSurface`, see
// surface-contrast.ts/.test.ts) — never a hardcoded `variant === "outline"`
// branch, which silently stops covering a THIRD variant added later with
// the same shape. This pins that: the wiring calls the shared derivation
// function, and never singles a variant name out by string comparison.
//
// SOURCE-LEVEL: primitives-section.tsx imports components/ui/button.tsx
// (Button, via GroupedExample -> components-map.ts), which imports
// @/i18n/navigation — unresolvable under this repo's Vitest config (see
// components-map.test.ts's header) — so this reads source text, like every
// other gallery guard.

const source = readFileSync(
  fileURLToPath(new URL("./primitives-section.tsx", import.meta.url)),
  "utf8",
)

function buttonGroupSource(): string {
  const start = source.indexOf('<PrimitiveGroup name="Button">')
  const end = source.indexOf('<PrimitiveGroup name="Badge">')
  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  return source.slice(start, end)
}

describe("Button group — surface patch is derived, not hardcoded (s15-gallery-feedback follow-up)", () => {
  // s15-gallery-feedback (second follow-up) — this is the guard that makes
  // "breaking the wiring goes red" true for surface-contrast.test.ts's
  // behavioural test: that test only proves `surfacePatch` (the function)
  // does the right thing; THIS test proves the gallery actually calls it,
  // for every item, instead of a reimplementation or a hardcoded branch.
  it("calls the shared surfacePatch derivation", () => {
    expect(buttonGroupSource()).toMatch(/surfacePatch\(/)
  })

  it("imports surfacePatch from surface-contrast.ts", () => {
    expect(source).toMatch(
      /import\s*\{[^}]*surfacePatch[^}]*\}\s*from\s*["']@\/components\/gallery\/surface-contrast["']/,
    )
  })

  it('does not single out "outline" or "ghost" by name (would silently miss a future variant)', () => {
    const block = buttonGroupSource()
    expect(block).not.toMatch(/variant\s*===\s*["']outline["']/)
    expect(block).not.toMatch(/variant\s*===\s*["']ghost["']/)
    expect(block).not.toMatch(/\[\s*["']outline["']\s*,\s*["']ghost["']\s*\]/)
  })

  it("still derives its variant list from Object.keys/Object.entries(buttonVariants) — not a recopied list", () => {
    const block = buttonGroupSource()
    expect(block).toMatch(/Object\.(keys|entries)\(buttonVariants\)/)
  })
})
