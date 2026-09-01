import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// T3 (s14-dataviz-and-combobox) — ADR 006's real failure mode: Recharts
// ships its own default series colours (Line's default stroke, Bar's
// default fill, Pie's default fill/stroke — read from node_modules/
// recharts source directly, not reproduced here as hex literals, which
// would itself defeat check-design-tokens) applied whenever a series has
// no explicit `fill`/`stroke`. `check-design-tokens` cannot see this (it
// only flags a LITERAL hex typed in app|components|lib — it has no idea
// what a third-party default is), so this is a source-level regression
// guard specific to this story: every chart wrapper must pass its colours
// via `var(--color-…)`, never omit them, and never spell out a hex.
//
// This complements, and does not replace, the "read the served SVG"
// verification the plan requires (Vitest cannot render Recharts here — see
// the repo-wide constraint documented in components-map.test.ts's header).

const FILES = ["chart-line.tsx", "chart-bar.tsx", "chart-donut.tsx"].map((f) =>
  fileURLToPath(new URL(`./${f}`, import.meta.url)),
)

// The element + colour attribute this wrapper is responsible for colouring
// explicitly: `<Line stroke=…>`, `<Bar fill=…>`, `<Cell fill=…>` (donut
// slices).
const SERIES_ELEMENTS: Record<
  string,
  { tag: string; attr: "fill" | "stroke" }
> = {
  "chart-line.tsx": { tag: "Line", attr: "stroke" },
  "chart-bar.tsx": { tag: "Bar", attr: "fill" },
  "chart-donut.tsx": { tag: "Cell", attr: "fill" },
}

describe("chart wrappers — series colours come from tokens, never a Recharts default", () => {
  it.each(FILES)("%s contains no raw hex colour literal", (file) => {
    const source = readFileSync(file, "utf8")
    const hexMatches = source.match(/#[0-9A-Fa-f]{3,8}\b/g) ?? []
    expect(
      hexMatches,
      `${file} contains raw hex colour(s): ${hexMatches.join(", ")} — use var(--color-…) instead`,
    ).toEqual([])
  })

  it.each(FILES)(
    "%s defines its series colours as var(--color-…) tokens",
    (file) => {
      const source = readFileSync(file, "utf8")
      const tokenRefs = source.match(/var\(--color-[a-z0-9-]+\)/g) ?? []
      expect(
        tokenRefs.length,
        `${file} has no var(--color-…) reference at all — series colours must come from design tokens`,
      ).toBeGreaterThan(0)
    },
  )

  it("every <Line>/<Bar>/<Cell> element in its wrapper sets the colour attribute explicitly", () => {
    for (const file of FILES) {
      const name = file.split("/").pop()!
      const { tag, attr } = SERIES_ELEMENTS[name]
      const source = readFileSync(file, "utf8")
      // Every self-closing-or-not opening tag for this element, captured up
      // to its closing `>` (JSX attributes never contain a bare `>`).
      const openTags = [...source.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "g"))]
      expect(
        openTags.length,
        `${file} renders no <${tag}> at all — nothing to colour`,
      ).toBeGreaterThan(0)
      for (const [tagSource] of openTags) {
        expect(
          tagSource,
          `${file}: <${tag}> element with no explicit ${attr}= — it will render with Recharts' own default colour: ${tagSource}`,
        ).toMatch(new RegExp(`\\b${attr}=`))
      }
    }
  })
})
