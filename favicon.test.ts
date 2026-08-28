import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// T4 (s10-defect-sweep) — the favicon rendered the Applyzi "A" letterform mark
// (same path data as the original brand), visible in the browser tab, bookmarks
// and the PWA install prompt. Stripping the XML comment is not enough: the mark
// itself must be redrawn as a neutral, geometric shape.
//
// Lives at the repo root, NOT under public/: public/ is served verbatim at the
// site root by Next, so a *.test.ts file there is downloadable in production
// (see public-assets.test.ts, which guards against this recurring).

const svgPath = fileURLToPath(new URL("./public/favicon.svg", import.meta.url))
const svg = readFileSync(svgPath, "utf8")

// Fragment unique to the old Applyzi "A" letterform path data (shared by the
// pre-fix favicon and components/brand/logo.tsx's mark paths).
const OLD_APPLYZI_MARK_FRAGMENT = "M49.9,100.4"

describe("public/favicon.svg — no inherited Applyzi branding (s10-defect-sweep T4)", () => {
  it('contains no "applyzi" string (case-insensitive), including XML comments', () => {
    expect(
      /applyzi/i.test(svg),
      "favicon.svg must not reference Applyzi anywhere, including XML comments",
    ).toBe(false)
  })

  it("does not reuse the old Applyzi letterform path data", () => {
    expect(
      svg.includes(OLD_APPLYZI_MARK_FRAGMENT),
      "favicon.svg must not reuse the Applyzi 'A' letterform path data — redraw a neutral geometric mark, not just remove the comment around it",
    ).toBe(false)
  })

  it("is a valid, non-empty SVG", () => {
    expect(svg).toContain("<svg")
    expect(svg).toContain("</svg>")
  })
})
