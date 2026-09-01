import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// s15-gallery-feedback (second follow-up) — the Card group derives whether
// a variant's example body needs the dark-on-dark text override from the
// variant's OWN class string (`variantClasses.includes("text-paper")`),
// not a hardcoded `variant === "pine"` check — that part was already right.
// But `.includes("text-paper")` is a raw substring match: it does not
// distinguish the variant's RESTING text colour from a `hover:text-paper`
// utility, and it would also match inside an unrelated longer class name.
// `textToken` (surface-contrast.ts) already does the narrower, correct
// parse this repo uses everywhere else for "what colour does this class
// string set" (strips variant prefixes, takes the last bare token) — this
// pins that the Card group reuses it instead of the raw substring check.
//
// This narrows, but does not close, the gap: the override string itself
// (`text-paper`, `text-paper/70`) is still a hardcoded literal in
// `cardExampleChildren`'s onDark branch, because Tailwind's static class
// extraction cannot build `text-${token}` from an arbitrary token at
// runtime (see the design-tokens guard, ADR 002) — a future dark variant
// whose own text override is some OTHER token (e.g. `text-sand`) would
// still need that literal touched. See the comment above the derivation in
// primitives-section.tsx for the same limit, stated for a reader there.
//
// SOURCE-LEVEL: primitives-section.tsx imports components/ui/card.tsx via
// components-map.ts (@/i18n/navigation) — unresolvable under this repo's
// Vitest config (see components-map.test.ts's header) — so this reads
// source text, like every other gallery guard.

const source = readFileSync(
  fileURLToPath(new URL("./primitives-section.tsx", import.meta.url)),
  "utf8",
)

function cardGroupSource(): string {
  const start = source.indexOf('<PrimitiveGroup name="Card / StatCard">')
  const end = source.indexOf('<PrimitiveGroup name="Title">')
  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  return source.slice(start, end)
}

describe("Card group — dark-variant text override is derived via textToken, not a raw substring match (s15-gallery-feedback follow-up)", () => {
  it("imports textToken from surface-contrast.ts", () => {
    expect(source).toMatch(
      /import\s*\{[^}]*textToken[^}]*\}\s*from\s*["']@\/components\/gallery\/surface-contrast["']/,
    )
  })

  it('derives onDark via textToken(variantClasses) === "paper", not a raw .includes substring match', () => {
    const block = cardGroupSource()
    expect(block).toMatch(/textToken\(variantClasses\)\s*===\s*["']paper["']/)
    expect(block).not.toMatch(
      /variantClasses\.includes\(\s*["']text-paper["']\s*\)/,
    )
  })

  it('does not single out "pine" by name (would silently miss a future dark variant)', () => {
    const block = cardGroupSource()
    expect(block).not.toMatch(/variant\s*===\s*["']pine["']/)
  })
})
