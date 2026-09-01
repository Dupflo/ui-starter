import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// s15-gallery-feedback (T5) — replaces the informal "54 code blocks" count
// that s12/s13's reviews verified BY HAND on served HTML every time
// (nothing in the suite pinned it — grep the repo: no test asserted any
// code-block count before this file). Grouping variants into one
// `GroupedExample` per component (see grouped-example.test.ts) makes the
// raw count drop from 54 to 24 — a real, deliberate change, not a drift:
// see docs/research/s15-gallery-feedback.md for the count's derivation.
//
// The guarantee the count was always a stand-in for is "every registered
// primitive is reachable and copyable in the gallery" — this test makes
// THAT the literal, checked invariant instead: every `components-map.ts`
// `COMPONENTS` key must appear at least once as a `component: "Name"`
// snippet reference in primitives-section.tsx (which is what feeds
// `codeOf`/`renderSnippet` — see snippet.ts). A component present in
// COMPONENTS with zero such reference is unreachable from the gallery even
// though components-map.test.ts would not catch it (that test only checks
// the OPPOSITE direction: components/ui export → COMPONENTS entry).
//
// SOURCE-LEVEL, same convention as every other gallery guard (see
// components-map.test.ts's header for why: the "use client" → next-intl
// import chain does not resolve under this repo's Vitest config).

const primitivesSource = readFileSync(
  fileURLToPath(new URL("./primitives-section.tsx", import.meta.url)),
  "utf8",
)
const mapSource = readFileSync(
  fileURLToPath(new URL("./components-map.ts", import.meta.url)),
  "utf8",
)

/** Keys of the `export const COMPONENTS = { ... }` object literal. */
function registeredNames(source: string): string[] {
  const body = source.match(/export const COMPONENTS = \{([\s\S]*?)\n\}/)
  if (!body) throw new Error("COMPONENTS object literal not found")
  const keyRe = /^\s*([A-Za-z][A-Za-z0-9]*),?\s*$/gm
  const names: string[] = []
  let m: RegExpExecArray | null
  while ((m = keyRe.exec(body[1]))) names.push(m[1])
  return names
}

/** Every `component: "Name"` snippet reference in a source string. */
function reachableComponentNames(source: string): Set<string> {
  const names = new Set<string>()
  const re = /component:\s*"([A-Za-z][A-Za-z0-9]*)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source))) names.add(m[1])
  return names
}

describe("primitives-section — every registered primitive is reachable and copyable (s15-gallery-feedback T5)", () => {
  it('has a `component: "Name"` snippet reference for every components-map.ts COMPONENTS key', () => {
    const registered = registeredNames(mapSource)
    const reachable = reachableComponentNames(primitivesSource)
    const missing = registered.filter((n) => !reachable.has(n))

    expect(
      missing,
      `COMPONENTS entries with no snippet reference in primitives-section.tsx (unreachable in the gallery): ${missing.join(", ")}`,
    ).toEqual([])
  })
})

describe("reachableComponentNames — neutralization proof (catches a real removal)", () => {
  it("flags a component missing from a snippet source that otherwise lists every other one", () => {
    const registered = registeredNames(mapSource)
    // Fabricate a source that references every registered name EXCEPT the
    // first one, exactly the shape a real regression would take (a
    // component's whole PrimitiveGroup deleted from primitives-section.tsx).
    const [omitted, ...rest] = registered
    const fixture = rest.map((n) => `component: "${n}"`).join(",\n")

    const reachable = reachableComponentNames(fixture)
    const missing = registered.filter((n) => !reachable.has(n))

    expect(missing).toEqual([omitted])
  })

  it("passes when every registered name is present (sanity)", () => {
    const registered = registeredNames(mapSource)
    const fixture = registered.map((n) => `component: "${n}"`).join(",\n")

    const reachable = reachableComponentNames(fixture)
    const missing = registered.filter((n) => !reachable.has(n))

    expect(missing).toEqual([])
  })
})
