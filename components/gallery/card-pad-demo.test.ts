import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// T2 (s18-ui-kit-polish, annotation `mtlqwiur9l4` — "je vois pas l'intérêt")
// — the Card group used to render THREE stacked cards (sm/md/lg) with
// IDENTICAL content, only `pad` differing. `GroupedExample`'s preview row is
// `flex flex-wrap` (example.tsx): each full-width Card wraps to its own
// line, so the three examples read as three near-identical repeats with no
// side-by-side reference to compare against — the annotation is right that
// the gap teaches nothing there.
//
// DECISION (T2, one of two defensible options per the plan): drop the live
// `pad` demo rather than build a bespoke side-by-side layout for a
// spacing-only difference. `pad` is already fully documented in
// docs/design-system.md's Card props row (`pad` = `sm`|`md`|`lg`) — unlike
// `variant`, which changes what a Card actually LOOKS like (border vs solid
// dark) and stays worth a live example, `pad` only changes an internal
// spacing value, which a props table communicates exactly as well as a
// screenshot of three barely-different boxes would. Chosen over the
// side-by-side alternative: a fixed-width comparison would need its own
// non-stretching layout (Card intentionally has no `width` prop to pin),
// adding a bespoke visual pattern for a token value that doesn't change the
// component's shape.
//
// SOURCE-LEVEL, same convention as every other gallery guard in this repo
// (see components-map.test.ts's header): primitives-section.tsx imports
// components/ui/card.tsx via components-map.ts, which is unresolvable
// under this repo's Vitest config.

const primitivesSource = readFileSync(
  fileURLToPath(new URL("./primitives-section.tsx", import.meta.url)),
  "utf8",
)
const designSystemSource = readFileSync(
  fileURLToPath(new URL("../../docs/design-system.md", import.meta.url)),
  "utf8",
)

function cardGroupSource(): string {
  const start = primitivesSource.indexOf(
    '<PrimitiveGroup name="Card / StatCard">',
  )
  const end = primitivesSource.indexOf('<PrimitiveGroup name="Title">')
  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  return primitivesSource.slice(start, end)
}

describe("Card group — no repeated pad-only demo (s18-ui-kit-polish T2)", () => {
  it("does not import Card's pads table (cardPads) — no live pad comparison left to derive from", () => {
    expect(primitivesSource).not.toMatch(
      /import\s*\{[^}]*\bpads\b[^}]*\}\s*from\s*["']@\/components\/ui\/card["']/,
    )
  })

  it("the Card group never sets a `pad` prop on a mapped/looped example", () => {
    const block = cardGroupSource()
    expect(block).not.toMatch(/props:\s*\{\s*pad[,:]/)
  })

  it("docs/design-system.md's Card row documents `pad` (sm/md/lg) in the props table — the decision's other half", () => {
    const cardRow = designSystemSource
      .split("\n")
      .find((line) => line.trimStart().startsWith("| `Card`"))
    expect(cardRow, "expected a Card row in the props table").toBeDefined()
    expect(cardRow).toMatch(/`pad`\s*=\s*`sm`.*`md`.*`lg`/)
  })
})
