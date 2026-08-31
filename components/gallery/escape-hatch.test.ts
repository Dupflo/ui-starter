import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// Review fix (s12-ui-gallery, major 2) — `Example`'s `render` prop is the
// only thing that can make the copyable code diverge from what's actually
// shown live: `codeOf`/`renderSnippet` both read the same `Snippet`, so
// THEY cannot diverge by construction (see snippet.test.ts's header), but a
// hand-composed `render` is arbitrary JSX with no such guarantee — and it
// already drifted once (the form block's spacing wrapper + Button
// className were visible in `render` and absent from the paired snippet,
// fixed alongside this test).
//
// This closes the hole: every `render:` usage site in the two gallery
// section files must carry an explicit "ESCAPE HATCH" justification
// comment directly above it, and the total count is pinned. A new `render:`
// usage added without both — the comment AND a deliberate bump of the
// pinned count — fails the suite, so the escape hatch can never grow
// silently again.
//
// SOURCE-LEVEL, NOT A RUNTIME DIFF AGAINST `renderSnippet(snippet)`: the
// strongest guard would render both paths and diff them, but every
// component `render` stands in for here (TextField, Modal, Lightbox) is a
// "use client" component that transitively imports "@/i18n/navigation" —
// the same import chain components-map.test.ts's header documents as
// unresolvable under this repo's Vitest config. Source-text scanning is
// this repo's established convention for exactly that reason (see also
// components-map.test.ts, app/[locale]/ui/page.test.ts).

const FILES = [
  fileURLToPath(new URL("./primitives-section.tsx", import.meta.url)),
  fileURLToPath(new URL("./blocks-section.tsx", import.meta.url)),
]

// A definitional escape-hatch usage is either:
//  - the object-literal `render: (` form (GridItem / block array entries), or
//  - a direct JSX `render={` prop carrying its own element (Modal, Lightbox).
// `<Example ... render={render} />` inside ExampleGrid forwards an already-
// resolved value under that same name — the negative lookahead excludes
// exactly that one literal shape so it is never miscounted as a new usage.
// NB: an earlier version matched only the PARENTHESISED form (`render: (`).
// `render: <div />` and `render: someVar` are equally valid and slipped
// through silently — a probe added a 6th usage and the suite stayed green.
// Match `render:` followed by ANY value, and `render={` except the one
// forwarding shape below.
const RENDER_USAGE_RE = /(?:^|[\s{,])render:\s*\S|render=\{(?!render\})/

const PINNED_TOTAL = 5

describe("gallery render escape hatch — every usage is justified and enumerated", () => {
  it("has an ESCAPE HATCH justification comment directly above every `render:` usage", () => {
    for (const file of FILES) {
      const lines = readFileSync(file, "utf8").split("\n")
      lines.forEach((line, i) => {
        if (!RENDER_USAGE_RE.test(line)) return
        const above = lines.slice(Math.max(0, i - 10), i).join("\n")
        expect(
          above,
          `${file}:${i + 1} — a \`render:\` escape hatch with no "ESCAPE HATCH" justification comment within the 10 lines above it`,
        ).toMatch(/ESCAPE HATCH/)
      })
    }
  })

  it(`pins the total count of render escape hatches (${PINNED_TOTAL}) — bump this deliberately, with a justification comment, when adding one`, () => {
    const total = FILES.reduce((sum, file) => {
      const source = readFileSync(file, "utf8")
      return sum + (source.match(new RegExp(RENDER_USAGE_RE, "g")) ?? []).length
    }, 0)

    expect(total).toBe(PINNED_TOTAL)
  })
})
