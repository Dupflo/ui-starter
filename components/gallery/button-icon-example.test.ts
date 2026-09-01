import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// s16-gallery-fixes (annotation `mtiw8hcnkwy`, "boutton icone sans icon pas
// très explicite") — the Button size group used to render every size with
// its own name as the demo children (`children: size`); for `size="icon"`
// that put the literal word "icon" inside a square icon-only button, which
// demonstrates nothing about what the size is for. The icon size gets a
// real 16×16 stroke SVG instead — same convention as the nav icons in
// components/app/app-sidebar.tsx (viewBox 0 0 16 16, stroke="currentColor",
// strokeWidth 1.5, round caps) — plus an aria-label, since the button no
// longer carries a visible accessible name. Every OTHER size keeps
// rendering its own name as plain text, unchanged.
//
// Still derived: the size list itself is untouched — still
// `Object.keys(buttonSizes)` over the real table exported by
// components/ui/button.tsx, so a size added, renamed or removed there
// keeps showing up automatically (see the "still derives" test below).
// That derivation only covers the LIST, though: the icon swap itself is
// keyed on the literal string "icon" (`size === "icon"`), not on any
// property of the table. Renaming that one key (e.g. `icon` → `square`)
// would still show the row (derivation holds) but with its new name as
// plain text, not the icon — `Object.keys(buttonSizes)` types as
// `string[]`, so there is no compile-time link between the size union in
// components/ui/button.tsx and this literal to keep them in sync (and
// review fix, minor 2, judged a type-level fix not worth reaching for
// here — below the story's AC bar, which only requires a genuinely NEW
// size to appear untouched).
//
// SOURCE-LEVEL, consistent with every other gallery guard in this repo:
// primitives-section.tsx transitively imports "use client" components
// through components-map.ts → "@/i18n/navigation", unresolvable under this
// repo's Vitest config (see components-map.test.ts's header).

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

function buttonSizeMapSource(): string {
  const block = buttonGroupSource()
  const start = block.indexOf("Object.keys(buttonSizes)")
  expect(
    start,
    "expected a buttonSizes map in the Button group",
  ).toBeGreaterThan(-1)
  const end = block.indexOf("disabled: true")
  expect(end).toBeGreaterThan(start)
  return block.slice(start, end)
}

// s16-gallery-fixes (review fix, major 1) — the five checks below used to
// each grep an isolated fragment (`size === "icon"` somewhere, `component:
// "svg"` somewhere in the whole 848-line file, `viewBox` somewhere), none
// of them tying the icon-size BRANCH to the BUTTON_ICON_SIZE_EXAMPLE
// constant it is supposed to render. The reviewer's neutralization proved
// it: swapping `children: size === "icon" ? BUTTON_ICON_SIZE_EXAMPLE :
// size` back to `children: size === "icon" ? "icon" : size` — reintroducing
// the exact defect this story fixes, the literal word "icon" inside the
// icon-only button — left all six tests green, because the (now unused)
// constant declaration was untouched and still matched every fragment
// check. `buttonIconSizeExampleSource()` isolates the constant's OWN
// definition (so "svg"/viewBox/stroke are pinned to it specifically, not
// to "somewhere in the file"), and the new first test below matches the
// exact ternary text, so it fails under that mutation.
function buttonIconSizeExampleSource(): string {
  const start = source.indexOf("const BUTTON_ICON_SIZE_EXAMPLE: Snippet = {")
  expect(
    start,
    "expected a BUTTON_ICON_SIZE_EXAMPLE constant definition",
  ).toBeGreaterThan(-1)
  const end = source.indexOf("/** One `ExampleGrid` cell", start)
  expect(end).toBeGreaterThan(start)
  return source.slice(start, end)
}

describe("Button size group — the icon size shows a real icon, not its own name (s16-gallery-fixes)", () => {
  it("still derives the size list from Object.keys(buttonSizes) — not a recopied list", () => {
    expect(buttonGroupSource()).toMatch(/Object\.keys\(buttonSizes\)/)
  })

  it("does not unconditionally set the size's own name as every size's children", () => {
    // The old bug: `children: size` for every size, including "icon".
    const block = buttonSizeMapSource()
    expect(block).not.toMatch(
      /children:\s*size\s*,?\s*\n\s*\}\s*,?\s*\n\s*\}\)/,
    )
  })

  it('wires the icon branch\'s children to the BUTTON_ICON_SIZE_EXAMPLE constant, not a re-typed "icon" literal', () => {
    const block = buttonSizeMapSource()
    expect(block).toMatch(
      /children:\s*size\s*===\s*["']icon["']\s*\?\s*BUTTON_ICON_SIZE_EXAMPLE\s*:\s*size\s*,/,
    )
  })

  it("gives the icon-size button an aria-label (no more visible text as its accessible name)", () => {
    const block = buttonSizeMapSource()
    expect(block).toMatch(/["']aria-label["']/)
  })

  it('renders an "svg" snippet component in the BUTTON_ICON_SIZE_EXAMPLE constant itself', () => {
    expect(buttonIconSizeExampleSource()).toMatch(/component:\s*"svg"/)
  })

  it("follows the app-sidebar 16×16 stroke icon convention (viewBox, stroke, round caps), in that same constant", () => {
    const block = buttonIconSizeExampleSource()
    expect(block).toContain('viewBox: "0 0 16 16"')
    expect(block).toContain('stroke: "currentColor"')
    expect(block).toContain('strokeLinecap: "round"')
    expect(block).toContain('strokeLinejoin: "round"')
  })
})
