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
  // `] as const satisfies ...` or similar) — slicing from the start
  // comfortably covers the whole snippet object without depending on exact
  // downstream content. Bumped 2000 → 2400 (fix mode, s19-action-menu,
  // MINOR 2): deriving the ActionMenu label from `actionsLabelTemplate`
  // instead of a hardcoded literal lengthened the `columns` line enough to
  // push the trailing `rows.code` match past the old 2000-char window.
  return source.slice(start, start + 2400)
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

// s19-action-menu (T5, annotation `mtlqyltsxz8`) — same theme as the
// Avatar guard above: the "Utilisateurs" block's row action moved from a
// lone "Voir" `Button` to an `ActionMenu` (view/edit/delete) in
// data-table-users-demo.tsx. A copyable snippet still showing the old
// `<Button>` cell would be exactly the "copy-pastable truth" defect this
// file exists to prevent, just for a different cell.
describe("gallery — Utilisateurs block's columns snippet accurately shows the real ActionMenu action cell (s19-action-menu T5)", () => {
  it("references <ActionMenu> in the copyable columns code, not the old Button", () => {
    const block = usersBlockSource()
    const columnsCodeMatch = block.match(/columns:\s*{\s*code:\s*`([\s\S]*?)`,/)
    expect(
      columnsCodeMatch,
      "expected a columns.code template string",
    ).not.toBeNull()
    expect(columnsCodeMatch![1]).toMatch(/<ActionMenu\b/)
    expect(columnsCodeMatch![1]).not.toMatch(/<Button\b/)
  })

  it("shows the destructive delete action in the copyable code", () => {
    const block = usersBlockSource()
    const columnsCodeMatch = block.match(/columns:\s*{\s*code:\s*`([\s\S]*?)`,/)
    expect(columnsCodeMatch![1]).toMatch(/destructive:\s*true/)
  })
})

// Fix mode (review, MINOR 2) — the copyable code showed a HARDCODED English
// literal (`label={\`Actions for \${row.name}\`}`) while every other string
// on this same line is interpolated from `labels.usersLabels`, and while
// data-table-users-demo.tsx's REAL cell derives the label from
// `labels.actionsLabelTemplate.replace("{name}", row.name)` — served on
// `/fr/ui`, the copyable snippet showed English right next to
// "Voir"/"Modifier"/"Supprimer", and drifted from the real cell it claims
// to document.
describe("gallery — Utilisateurs block's ActionMenu label matches the real i18n template, not a hardcoded English string (s19-action-menu fix mode, MINOR 2)", () => {
  it('derives the copyable label from usersActionsLabelTemplate (fr: "Actions pour {name}", en: "Actions for {name}"), never a literal "Actions for"', () => {
    const block = usersBlockSource()
    const columnsCodeMatch = block.match(/columns:\s*{\s*code:\s*`([\s\S]*?)`,/)
    expect(
      columnsCodeMatch,
      "expected a columns.code template string",
    ).not.toBeNull()
    expect(columnsCodeMatch![1]).not.toMatch(/Actions for/)
    expect(columnsCodeMatch![1]).toMatch(/actionsLabelTemplate/)
    expect(columnsCodeMatch![1]).toMatch(
      /\.replace\(\s*"\{name\}"\s*,\s*row\.name\s*\)/,
    )
  })
})
