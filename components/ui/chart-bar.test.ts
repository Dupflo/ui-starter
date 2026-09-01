import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// Review finding (s14-dataviz-and-combobox, minor) — chart-bar.tsx reused
// chart-line.tsx's `ChartLineSeries` type for its own `series` prop: a bar
// chart's series described by a type named after line charts. Source-level
// guard (same repo-wide constraint as the other chart-*.test.ts files — no
// jsdom/happy-dom here, see components-map.test.ts's header).

const source = readFileSync(
  fileURLToPath(new URL("./chart-bar.tsx", import.meta.url)),
  "utf8",
)

describe("ChartBar — its series type is its own, not chart-line's", () => {
  it("does not import ChartLineSeries", () => {
    expect(source).not.toContain("ChartLineSeries")
  })

  it("exports and uses its own ChartBarSeries type", () => {
    expect(source).toMatch(/export type ChartBarSeries\b/)
    expect(source).toMatch(/series:\s*ChartBarSeries\[\]/)
  })
})
