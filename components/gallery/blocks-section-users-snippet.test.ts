import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// Review finding (docs/reviews/s17-data-table.md, MINOR 4), SUPERSEDED by
// T5 (s18-ui-kit-polish): the "Utilisateurs" block's copyable `columns`
// snippet used to show `cell: (row) => <Avatar/name>` — not valid JSX, for
// a component docs/design-system.md explicitly said did not exist at the
// time (the avatar was plain tokens: rounded-full + initials). Elided to
// `/* … */`, same as the sibling `rows` line.
//
// `components/ui/avatar.tsx` exists now (T3, same story) and
// data-table-users-demo.tsx genuinely renders a dedicated avatar column
// through it (data-table-users-demo.test.ts). Eliding a NOW-REAL,
// copy-pasteable `<Avatar src={row.avatarSrc} name={row.name} decorative
// />` would be LESS accurate than showing it — the whole point this test's
// title states ("copy-pastable truth") — so the copyable code shows it for
// real, and this file pins that it matches what the composition actually
// renders instead of eliding it.
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

describe("gallery — Utilisateurs block's columns snippet accurately shows the real Avatar cell (s17-data-table, updated s18-ui-kit-polish T5)", () => {
  it("references <Avatar> in the copyable columns code — a real, existing primitive now", () => {
    const block = usersBlockSource()
    expect(block).toMatch(/<Avatar\b/)
  })

  it("the shown Avatar usage is decorative — matches what data-table-users-demo.tsx actually renders (name already visible in its own column)", () => {
    const block = usersBlockSource()
    const columnsCodeMatch = block.match(/columns:\s*{\s*code:\s*`([\s\S]*?)`,/)
    expect(
      columnsCodeMatch,
      "expected a columns.code template string",
    ).not.toBeNull()
    expect(columnsCodeMatch![1]).toMatch(/<Avatar[^>]*\bdecorative\b[^>]*\/>/)
  })

  it("still elides the `rows` data the same way (/* … */) — only the columns shape needs to be shown in full", () => {
    const block = usersBlockSource()
    const rowsCodeMatch = block.match(/rows:\s*{\s*code:\s*`([\s\S]*?)`,/)
    expect(rowsCodeMatch, "expected a rows.code template string").not.toBeNull()
    expect(rowsCodeMatch![1]).toMatch(/\/\* … \*\//)
  })
})
