import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// Review finding (docs/reviews/s17-data-table.md, MINOR 4): the
// "Utilisateurs" block's copyable `columns` snippet showed
// `cell: (row) => <Avatar/name>` — not valid JSX, and `Avatar` is a
// component docs/design-system.md explicitly says does not exist (the
// avatar here is plain tokens: rounded-full + initials, see
// data-table-users-demo.tsx). In a gallery whose whole point is
// copy-pastable truth, that reads as a real component reference. Fixed to
// the same `/* … */` elision the sibling `rows` line already uses.
//
// SOURCE-LEVEL, same precedent as blocks-section-pricing-gap.test.ts:
// blocks-section.tsx transitively imports "use client" components
// unresolvable under this repo's Vitest config (see components-map.test.ts's
// header).

const source = readFileSync(
  fileURLToPath(new URL("./blocks-section.tsx", import.meta.url)),
  "utf8",
)

function usersBlockSource(): string {
  const start = source.indexOf("// Utilisateurs")
  expect(start, "expected the Utilisateurs block comment").toBeGreaterThan(-1)
  // The block runs to the end of the array literal (the file's closing
  // `] as const satisfies ...` or similar) — slicing 2000 chars from the
  // start comfortably covers the whole snippet object without depending on
  // exact downstream content.
  return source.slice(start, start + 2000)
}

describe("gallery — Utilisateurs block's columns snippet never shows an Avatar component reference (s17-data-table)", () => {
  it("does not reference <Avatar> in the copyable columns code", () => {
    const block = usersBlockSource()
    expect(block).not.toMatch(/<Avatar\b/)
  })

  it("elides the avatar cell the same way the sibling rows line elides row data (/* … */)", () => {
    const block = usersBlockSource()
    const columnsCodeMatch = block.match(/columns:\s*{\s*code:\s*`([\s\S]*?)`,/)
    expect(
      columnsCodeMatch,
      "expected a columns.code template string",
    ).not.toBeNull()
    expect(columnsCodeMatch![1]).toMatch(/\/\* … \*\//)
  })
})
