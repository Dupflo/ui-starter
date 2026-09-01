import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// s15-gallery-feedback (follow-up) — Combobox's default-open listbox
// (`defaultOpen: true`, chosen in s14 so the served DOM carries a
// populated, role="option"-bearing listbox by default) is a
// `position: absolute` popup: it does not affect the preview row's own
// flow height, so it visually overlaid the CodeDisclosure "Voir le
// code"/"Copier" footer directly beneath it — reproduced BEFORE
// s15-gallery-feedback's grouping too (one card at a time), so this is not
// a regression from grouping, but it is a real, fixable overlap.
//
// Decision: give the popup room, not drop `defaultOpen`. Dropping it would
// lose the property s14 deliberately added it for (an accessible,
// role="option"-bearing listbox visible in the served HTML without
// simulating focus/typing — this repo has no jsdom/keyboard-event testing,
// see combobox.tsx's own header comment, so that visibility is the only
// way this repo's tooling can ever see the listbox's ARIA shape at all).
// The popup's maximum possible height is bounded by `max-h-60` in
// combobox.tsx (240px), but `pb-40` (160px) does NOT cover that bound —
// it is sized for what today's demo actually renders, at most 3
// `role="option"` rows (~122px). Reserving room for the demo's real worst
// case, not the component's theoretical one, is the smaller, more honest
// fix — the example still opens for real, it simply has room to. That
// trade only stays honest if the demo can't silently outgrow the reserve:
// see this file's own option-count guard below, which fails the moment a
// demo item's option list grows past 3.
//
// SOURCE-LEVEL: primitives-section.tsx transitively imports "use client"
// components through components-map.ts (@/i18n/navigation) — unresolvable
// under this repo's Vitest config (see components-map.test.ts's header).

const source = readFileSync(
  fileURLToPath(new URL("./primitives-section.tsx", import.meta.url)),
  "utf8",
)

function comboboxGroupSource(): string {
  const start = source.indexOf('<PrimitiveGroup name="Combobox">')
  const end = source.indexOf('<PrimitiveGroup name="LocaleMenu')
  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  return source.slice(start, end)
}

describe("Combobox group — the preview row reserves room for its own open popup (s15-gallery-feedback follow-up)", () => {
  it("passes a previewClassName with extra bottom padding to GroupedExample", () => {
    const block = comboboxGroupSource()
    const match = block.match(/previewClassName=\{?["']([^"'}]+)["']\}?/)
    expect(
      match,
      "expected a previewClassName on the Combobox GroupedExample",
    ).not.toBeNull()
    expect(match![1]).toMatch(/\bpb-\d+\b/)
  })

  it("still opens for real (defaultOpen stays true — the fix is room, not hiding the popup)", () => {
    const block = comboboxGroupSource()
    expect(block).toMatch(/defaultOpen:\s*true/)
  })

  // s15-gallery-feedback (second follow-up) — `pb-40` (160px) does NOT
  // cover `max-h-60` (240px), the number both this file's original comment
  // and primitives-section.tsx's cited as the rationale: it covers today's
  // 3-option demo (~122px of rendered listbox), not the component's actual
  // bound. Rather than pad for a height nothing here renders, the reserve
  // stays sized for what the demo actually shows — but that trade is only
  // honest if a future item can't silently grow past it. This pins the
  // option count every demo item may not exceed; bump it (and re-check the
  // padding) deliberately if a demo ever needs a 4th option.
  it("no demo item's option list exceeds 3 entries — the count pb-40 is actually sized for (not max-h-60)", () => {
    const block = comboboxGroupSource()
    const optionLists = [
      ...block.matchAll(/options:\s*\{[\s\S]*?value:\s*\[([\s\S]*?)\n\s*\],/g),
    ]
    expect(
      optionLists.length,
      "expected to find at least one Combobox `options.value` array",
    ).toBeGreaterThan(0)
    for (const [, arrayBody] of optionLists) {
      const entries = arrayBody.match(/\{\s*value:/g) ?? []
      expect(entries.length).toBeLessThanOrEqual(3)
    }
  })
})
