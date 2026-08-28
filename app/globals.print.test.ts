import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// T1 (s10-defect-sweep) — the CV print layer (#cv-print) is dead: the element it
// portals to is never rendered, so `body > * { display: none }` hides every route
// on print and nothing re-shows it. Source-level guard against reintroducing that
// layer. The authoritative check is on the COMPILED stylesheet (grepped manually
// during implementation — see docs/research/s10-defect-sweep.md); this test only
// pins the source so the regression can't silently come back.

const cssPath = fileURLToPath(new URL("./globals.css", import.meta.url))
const css = readFileSync(cssPath, "utf8")

describe("app/globals.css — print layer (s10-defect-sweep T1)", () => {
  it("does not reference the dead #cv-print element", () => {
    expect(
      css,
      "globals.css must not reference #cv-print — the element it portals to is never rendered, so any rule keyed on it either hides everything or shows nothing",
    ).not.toMatch(/cv-print/)
  })

  it("has no @media print rule hiding `body > *`", () => {
    const printBlocks = css.match(/@media print\s*\{[\s\S]*?\n\}/g) ?? []
    for (const block of printBlocks) {
      expect(
        block,
        "an unlayered `body > * { display: none }` under @media print hides every route when printed, with nothing to re-show it",
      ).not.toMatch(/body\s*>\s*\*/)
    }
  })

  it("if a print reset forces a light background, it also forces a dark foreground", () => {
    const printBlocks = css.match(/@media print\s*\{[\s\S]*?\n\}/g) ?? []
    for (const block of printBlocks) {
      const forcesBackground =
        /\bhtml\s*,?\s*\n?\s*body\s*\{[^}]*background/s.test(block)
      if (forcesBackground) {
        expect(
          block,
          "body sets color: var(--color-paper); a print reset forcing background without also forcing color reproduces the invisible-wordmark bug in print",
        ).toMatch(/\bhtml\s*,?\s*\n?\s*body\s*\{[^}]*color\s*:/s)
      }
    }
  })

  it("defines a .print-hide utility that hides non-content chrome", () => {
    const printBlocks = css.match(/@media print\s*\{[\s\S]*?\n\}/g) ?? []
    const hasPrintHide = printBlocks.some((block) =>
      /\.print-hide\s*\{[^}]*display\s*:\s*none/s.test(block),
    )
    expect(
      hasPrintHide,
      "globals.css must define a `.print-hide` rule under @media print (display: none) — repainting bg-pine chrome is unreliable (browsers drop descendant background-color when Background graphics is off), so non-content chrome (headers, persistent nav/sidebar) must be hidden instead",
    ).toBe(true)
  })
})
