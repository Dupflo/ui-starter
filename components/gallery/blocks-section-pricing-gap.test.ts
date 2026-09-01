import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// s16-gallery-fixes (annotation `mtiw7nypry9`, "Card buggué") — the pricing
// block's `SectionLabel` + `Badge` rendered crowded onto the same line
// ("01 —— OFFRE" immediately touching "Populaire", no gap). Diagnosed live
// (headless Chrome against a running DEMO_MODE=1 server, see the story
// report): both are `inline-flex` (section-label.tsx, badge.tsx), so they
// flow onto the same line regardless of the Card's `space-y-3` — Tailwind's
// space-y utility only sets a vertical margin (`margin-block-end` in this
// v4 build, confirmed by reading the compiled CSS), which cannot separate
// two elements sharing one line horizontally. Measured on a real DOM: with
// `space-y-3` present, SectionLabel's right edge (x=317.859375) and Badge's
// left edge (x=317.859375) were IDENTICAL — zero gap. Checked out at
// f53ce0e (s13, before s15 added `space-y-3` to this Card) and measured
// again: the exact same zero gap, because the pricing Card had no spacing
// className at all back then either. PRE-EXISTING DEFECT, not an s15
// regression — s15's `space-y-3` fixed the block-level siblings (Title/
// Text/Button, which DID gain real gaps) but never touched this pair,
// which was never block-level to begin with.
//
// Fix: SectionLabel and Badge move into their own flex-row wrapper (a
// plain "div" snippet node, same precedent as the form block's spacing
// wrapper) with its own `gap-*`, so they get a REAL horizontal gap instead
// of a vertical margin that can't apply between same-line siblings. Fixed
// in the Snippet, not a `render` override (s12 major 2 — the copyable code
// must not diverge from the preview).
//
// SOURCE-LEVEL, consistent with every other gallery guard in this repo:
// blocks-section.tsx transitively imports "use client" components through
// TextFieldDemo → "@/i18n/navigation", unresolvable under this repo's
// Vitest config (see components-map.test.ts's header).

const source = readFileSync(
  fileURLToPath(new URL("./blocks-section.tsx", import.meta.url)),
  "utf8",
)

function pricingBlockSource(): string {
  const start = source.indexOf("// Pricing section")
  const end = source.indexOf("// Form —")
  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  return source.slice(start, end)
}

describe("pricing block — SectionLabel + Badge get a real horizontal gap (s16-gallery-fixes)", () => {
  it("wraps SectionLabel and Badge in a flex-row div carrying a gap className", () => {
    const block = pricingBlockSource()
    const divIndex = block.indexOf('component: "div"')
    expect(
      divIndex,
      "expected a plain div wrapper node around SectionLabel/Badge",
    ).toBeGreaterThan(-1)

    // The div's own className (the first className after this div's props
    // open, before its children array starts).
    const afterDiv = block.slice(divIndex)
    const classMatch = afterDiv.match(/className:\s*"([^"]*)"/)
    expect(
      classMatch,
      "expected the wrapper div to carry a className",
    ).not.toBeNull()
    expect(classMatch![1]).toMatch(/\bflex\b/)
    expect(classMatch![1]).toMatch(/\bgap-\d/)
  })

  it("the div wrapper contains both SectionLabel and Badge, and nothing else", () => {
    const block = pricingBlockSource()
    const divIndex = block.indexOf('component: "div"')
    const titleIndex = block.indexOf('component: "Title"')
    expect(titleIndex).toBeGreaterThan(divIndex)

    const wrapperSlice = block.slice(divIndex, titleIndex)
    expect(wrapperSlice).toContain('component: "SectionLabel"')
    expect(wrapperSlice).toContain('component: "Badge"')
  })

  it("SectionLabel is no longer a direct child of the Card (it moved into the wrapper)", () => {
    const block = pricingBlockSource()
    const cardChildrenStart = block.indexOf("children: [")
    const divIndex = block.indexOf('component: "div"')
    const sectionLabelIndex = block.indexOf('component: "SectionLabel"')
    // SectionLabel must appear AFTER the div wrapper opens (i.e. nested
    // inside it), not directly under Card's own children array.
    expect(cardChildrenStart).toBeGreaterThan(-1)
    expect(divIndex).toBeGreaterThan(cardChildrenStart)
    expect(sectionLabelIndex).toBeGreaterThan(divIndex)
  })

  it("the Card itself still reserves vertical spacing (space-y-3 on the Card's own className, not on the wrapper div)", () => {
    // Review fix (s16-gallery-fixes, minor 3): the previous version
    // regexed the WHOLE pricing block for "space-y-3", so it would still
    // pass if the new wrapper div carried the class instead of the Card.
    // Scope the search to the Card's own props — between `component:
    // "Card"` and the start of its `children` array — so the assertion is
    // about the Card specifically.
    const block = pricingBlockSource()
    const cardIndex = block.indexOf('component: "Card"')
    expect(
      cardIndex,
      "expected a Card component in the pricing block",
    ).toBeGreaterThan(-1)
    const cardChildrenIndex = block.indexOf("children: [", cardIndex)
    expect(cardChildrenIndex).toBeGreaterThan(cardIndex)
    const cardOwnProps = block.slice(cardIndex, cardChildrenIndex)
    expect(cardOwnProps).toMatch(/className:\s*"[^"]*\bspace-y-3\b[^"]*"/)
  })
})
