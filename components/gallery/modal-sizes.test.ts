import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// T4 (s13-gallery-ergonomics) — the story's explicit trap: the Modal size
// triggers must be DERIVED from the `sizes` table components/ui/modal.tsx
// exports (Object.keys over the real export), never a hand-copied list of
// size names — s12 already lived through exactly this drift for
// Button/Badge/Card variants (see PrimitivesSection's own header comment).
//
// WHY THE DERIVATION LIVES IN modal-demo.tsx, NOT primitives-section.tsx:
// `components/ui/modal.tsx` carries a `"use client"` directive (Modal is
// inherently stateful — portal-like overlay, open/close). Proven empirically
// (DEMO_MODE=1 build + a real `next start`, served HTML inspected): when
// `primitives-section.tsx` (a Server Component) imported `sizes` from that
// "use client" module and called `Object.keys()` on it at render time, the
// RSC flight payload showed `"sizeLabels":[]` — Next's react-server
// condition turns EVERY export of a "use client" module into an opaque
// client reference when accessed from server code, not just the component
// exports; a plain data export like `sizes` is not readable as a normal
// object from the server side of that boundary. `modal-demo.tsx` is already
// "use client" (see its own doc comment), so importing and iterating
// `sizes` there is the same-boundary import s12's original version already
// relied on (`Object.keys(sizes).join(" · ")`) — proven to work.
//
// SOURCE-LEVEL — see code-disclosure.test.ts's header for why runtime
// rendering isn't used for these gallery files under this repo's Vitest
// config.
//
// Review fix (s13-gallery-ergonomics, minor 1) — this file's own doc
// comment above (and modal-demo.tsx's, see its header) mentions the literal
// string `Object.keys(sizes)` in prose. A `toMatch` against the raw source
// is satisfiable by that prose alone, with the real call deleted — probed:
// replacing the real `Object.keys(sizes).map(` with
// `Object.entries(sizes).map(` left the "iterates Object.keys(sizes)"
// assertion below green. `stripComments` (mirrored from
// lib/demo/gallery-visibility.test.ts) removes that escape before matching.
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")
}

const source = readFileSync(
  fileURLToPath(new URL("./modal-demo.tsx", import.meta.url)),
  "utf8",
)
const code = stripComments(source)

describe("Modal size triggers — derived from the real `sizes` export (s13-gallery-ergonomics T4)", () => {
  it("is a Client Component (same boundary as the `sizes` export it reads)", () => {
    expect(source).toMatch(/^"use client"/)
  })

  it("imports `sizes` from components/ui/modal", () => {
    expect(code).toMatch(
      /import\s*\{\s*Modal,\s*sizes\s*\}\s*from\s*["']@\/components\/ui\/modal["']/,
    )
  })

  it("iterates Object.keys(sizes) rather than a literal size list", () => {
    expect(code).toMatch(/Object\.keys\(sizes\)/)
  })

  it("does not hardcode the modal size names as a literal string array", () => {
    expect(code).not.toMatch(/\[\s*"sm"\s*,\s*"md"\s*,\s*"lg"/)
  })

  it("renders one Button trigger per size instead of a single static trigger", () => {
    expect(code).toMatch(/Object\.keys\(sizes\)\.map\(/)
    // The s12-era single flat `triggerLabel: string` prop is gone — only
    // the new `triggerLabelTemplate` (interpolated per size) remains.
    expect(code).not.toMatch(/\btriggerLabel\s*:/)
  })
})
