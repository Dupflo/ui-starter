import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// Review fix (s13-gallery-ergonomics, minor 3) — `lightbox-demo.tsx`'s
// justification comment claimed demonstrating prev/next "would require a
// second real raster asset". False: `images` is a plain array and
// `Lightbox.go()` wraps with `(index + delta + count) % count`
// (components/ui/lightbox.tsx), so listing the one shipped asset twice with
// different captions exercises prev/next (NavButtons only render once
// `count > 1`) with no new asset. This pins that the demo now does exactly
// that, and that the comment no longer states the false blocker.
//
// SOURCE-LEVEL — see code-disclosure.test.ts's header for why runtime
// rendering isn't used for these gallery files under this repo's Vitest
// config (`Button` → `@/i18n/navigation` is unresolvable here).

const source = readFileSync(
  fileURLToPath(new URL("./lightbox-demo.tsx", import.meta.url)),
  "utf8",
)

describe("LightboxDemo — demonstrates prev/next with the repeated sample asset", () => {
  it("passes two images to Lightbox (count > 1, so NavButtons render)", () => {
    const srcOccurrences = source.match(/src:\s*"\/gallery\/sample\.png"/g)
    expect(srcOccurrences?.length).toBe(2)
  })

  it("does not point at a second, new raster asset", () => {
    expect(source).not.toMatch(
      /\/gallery\/(?!sample\.png)[^"]+\.(png|jpe?g|webp)/,
    )
  })

  it("no longer claims a second real raster asset would be required", () => {
    expect(source).not.toMatch(/second real raster asset/)
  })
})
