import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// s15-gallery-feedback (annotation `mtisujnabzm`) — the "État vide" (empty
// state) block's title/text/button had no vertical spacing between them:
// none of Title/Text/Card/Button apply their own margin (by design — see
// title.tsx/text.tsx/card.tsx), so a composed block with no spacing
// className renders its children flush against each other. The "form" and
// "stat row" blocks already carried deliberate spacing (`space-y-3`/
// `gap-4`) before this story; "page header", "pricing section" and "empty
// state" (the one the human circled) did not — checked, not assumed, by
// reading every block, per the annotation's own instruction.
//
// SOURCE-LEVEL, consistent with every other gallery test in this repo (see
// components-map.test.ts's header for why: the "use client" import chain
// through @/i18n/navigation does not resolve under this Vitest config).

const source = readFileSync(
  fileURLToPath(new URL("./blocks-section.tsx", import.meta.url)),
  "utf8",
)

/** Slice of the file between two anchor comments (or EOF for the last one). */
function sliceBetween(text: string, startAnchor: string, endAnchor?: string) {
  const start = text.indexOf(startAnchor)
  if (start === -1) throw new Error(`anchor not found: ${startAnchor}`)
  const end = endAnchor ? text.indexOf(endAnchor, start) : text.length
  if (endAnchor && end === -1) throw new Error(`anchor not found: ${endAnchor}`)
  return text.slice(start, end === -1 ? undefined : end)
}

const SPACE_Y_RE = /className:\s*"[^"]*\bspace-y-\d[^"]*"/

describe("blocks-section — every composed block spaces its children (s15-gallery-feedback)", () => {
  it("page header (Container > Title, Text, Button) reserves vertical spacing", () => {
    const block = sliceBetween(source, "// Page header", "// Pricing section")
    expect(block).toMatch(SPACE_Y_RE)
  })

  it("pricing section (Card > SectionLabel, Badge, Title, Text, Button) reserves vertical spacing", () => {
    const block = sliceBetween(source, "// Pricing section", "// Form —")
    expect(block).toMatch(SPACE_Y_RE)
  })

  it("empty state (Card > Title, Text, Button — the annotated block) reserves vertical spacing", () => {
    const block = sliceBetween(source, "// Empty state", "// Stat row")
    expect(block).toMatch(SPACE_Y_RE)
  })

  it("form block already spaces its children (space-y-3 wrapper, unchanged by this story)", () => {
    const block = sliceBetween(source, "// Form —", "// Empty state")
    expect(block).toMatch(SPACE_Y_RE)
  })
})
