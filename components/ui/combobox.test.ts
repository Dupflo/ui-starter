import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// T5 (s14-dataviz-and-combobox) — accessibility is a requirement here, not
// polish (docs/stories.md AC2). This is a source-level regression guard:
// it cannot prove real keyboard interaction (this repo's Vitest config has
// no jsdom/happy-dom, and components/ui/* fails to import at runtime — see
// components-map.test.ts's header for the reproduced, pre-existing cause),
// so it pins the ARIA surface's presence in source instead. The story
// report additionally reads the DOM actually served by a running instance
// (the only way to prove this for real) — see "combobox ARIA surface as
// served" there.

const source = readFileSync(
  fileURLToPath(new URL("./combobox.tsx", import.meta.url)),
  "utf8",
)

describe("Combobox — ARIA surface present in source", () => {
  it('sets role="combobox" on the input', () => {
    expect(source).toMatch(/role=["']combobox["']/)
  })

  it("wires aria-expanded", () => {
    expect(source).toContain("aria-expanded")
  })

  it("wires aria-controls (pointing at the listbox)", () => {
    expect(source).toContain("aria-controls")
  })

  it("wires aria-activedescendant (pointing at the highlighted option)", () => {
    expect(source).toContain("aria-activedescendant")
  })

  it('renders a role="listbox" popup', () => {
    expect(source).toMatch(/role=["']listbox["']/)
  })

  it('renders role="option" children', () => {
    expect(source).toMatch(/role=["']option["']/)
  })

  it("handles ArrowDown, ArrowUp, Enter, Escape, Home and End", () => {
    for (const key of [
      "ArrowDown",
      "ArrowUp",
      "Enter",
      "Escape",
      "Home",
      "End",
    ]) {
      expect(source).toContain(key)
    }
  })

  it("carries an aria-live region for the filtered result count", () => {
    expect(source).toContain("aria-live")
  })

  it("is a Client Component (stateful: query, open, highlighted index)", () => {
    expect(source.trimStart()).toMatch(/^"use client"/)
  })
})

// Review finding (s14-dataviz-and-combobox, major) — the input had no
// accessible name: the label was a bare <span>, never associated with the
// input (no htmlFor, no aria-labelledby, no aria-label on the control
// itself), so an AT fell back to the optional `placeholder`. Confirmed on
// the hydrated DOM via Accessibility.getPartialAXTree — see the story
// report. These pin the fix in source (same constraint as above: no
// jsdom/happy-dom here to assert the resolved accessible name directly).
describe("Combobox — accessible name", () => {
  it("associates the visible label with the input via a real <label htmlFor>, not a bare <span>", () => {
    expect(source).toMatch(/<label\s+htmlFor=\{inputId\}/)
  })

  it('never puts role="listbox" on a <div> (only a real listbox element gets it)', () => {
    expect(source).not.toMatch(/<div\s+[^>]*role=["']listbox["']/)
  })

  it('gives the empty-result popup a role="option" item (not free text) — a listbox\'s only valid children are option/group, and role="option" requires aria-selected', () => {
    expect(source).toMatch(
      /<li\b[^>]*role=["']option["'][^>]*aria-disabled[^>]*aria-selected[^>]*>\s*\{emptyLabel\}/,
    )
  })

  it('every <ul role="listbox"> popup carries aria-label={label}, populated or empty', () => {
    const listboxOpenTags = [
      ...source.matchAll(/<ul\b[^>]*role=["']listbox["'][^>]*>/g),
    ]
    expect(listboxOpenTags.length).toBeGreaterThan(0)
    for (const [tag] of listboxOpenTags) {
      expect(tag).toContain("aria-label={label}")
    }
  })
})
