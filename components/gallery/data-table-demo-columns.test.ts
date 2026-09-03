import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// T5 (s18-ui-kit-polish, annotation `mtlqxys25i7` — "ajoute plus de
// colonnes") — the bare `DataTable` primitive demo (primitives-section.tsx)
// only ever showed 3 text columns (name/email/role): not enough column
// TYPES for the multi-type sort the AC calls for (texte, nombre, date,
// statut). Horizontal scroll (data-table.tsx, T8 of s17) was already
// engaged at 3 columns on mobile — measured, the table was ~373px against
// a ~290px wrapper; the added columns widen that overflow, they don't
// newly demonstrate it. At ≥768px, neither the old nor the new column set
// scrolls.
//
// No avatar column here, deliberately: this is the BARE primitive demo,
// rendered directly from a Server Component with no client wrapper (see
// data-table.test.ts's "imports no components/ui primitive of its own" and
// this file's own DataTable entry, which uses plain columns — no `cell`).
// An Avatar cell needs a `cell` closure, which cannot cross the
// Server→Client boundary from here without becoming a new `render` escape
// hatch (see escape-hatch.test.ts) — the avatar column lives in the
// "Utilisateurs" composition instead (data-table-users-demo.tsx), which
// already pays that cost for its Badge/Button cells. Keeping this demo
// cell-free keeps `components/ui/data-table.tsx`'s own guarantee intact:
// the bare demo composes nothing beyond what a plain Snippet can express.
//
// SOURCE-LEVEL, same convention as every other gallery guard (see
// components-map.test.ts's header): primitives-section.tsx is unresolvable
// under this repo's Vitest config.

const source = readFileSync(
  fileURLToPath(new URL("./primitives-section.tsx", import.meta.url)),
  "utf8",
)

function dataTableGroupSource(): string {
  const start = source.indexOf('<PrimitiveGroup name="DataTable">')
  const end = source.indexOf('<PrimitiveGroup name="LocaleMenu')
  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  return source.slice(start, end)
}

/** The REAL `value: [...]` array behind `columns:` — never the display-only
 *  `code:` template string, which is a plain string that would happily
 *  match any regex the live config also matches (see this file's header). */
function realColumnsValueSlice(block: string): string {
  const valueStart = block.indexOf("value: [", block.indexOf("columns: {"))
  const valueEnd = block.indexOf("],", valueStart)
  return block.slice(valueStart, valueEnd)
}

/** Every `key: "..."` inside the REAL `value:` array (not the display-only
 *  `code:` template string, which is a plain string and would double-count). */
function realColumnKeys(block: string): string[] {
  const columnsValue = realColumnsValueSlice(block)
  return [...columnsValue.matchAll(/key:\s*"([a-zA-Z]+)"/g)].map((m) => m[1])
}

/** The single real column object for `key` — from `key: "<key>"` to its
 *  closing `},` — inside the REAL `value:` array. Columns are flat object
 *  literals (no nested `{`), so the next `},` always closes the one that
 *  started at `key`. Scoping to one object (rather than a character-count
 *  window) survives reformatting and can't bleed into a neighbouring
 *  column's `sortable`. */
function realColumnObject(value: string, key: string): string {
  const start = value.indexOf(`key: "${key}"`)
  expect(start).toBeGreaterThan(-1)
  const end = value.indexOf("},", start)
  return value.slice(start, end)
}

describe("primitives-section DataTable demo — enough columns and types for multi-type sort (T5)", () => {
  it("has at least 6 real columns (widens the mobile overflow that already existed at 3)", () => {
    const keys = realColumnKeys(dataTableGroupSource())
    expect(keys.length).toBeGreaterThanOrEqual(6)
  })

  it("adds a sortable NUMBER column (signups)", () => {
    const value = realColumnsValueSlice(dataTableGroupSource())
    expect(realColumnObject(value, "signups")).toMatch(/sortable:\s*true/)
  })

  it("adds a sortable DATE-shaped column (joinedDate)", () => {
    const value = realColumnsValueSlice(dataTableGroupSource())
    expect(realColumnObject(value, "joinedDate")).toMatch(/sortable:\s*true/)
  })

  it("adds a sortable STATUS-shaped column (plan)", () => {
    const value = realColumnsValueSlice(dataTableGroupSource())
    expect(realColumnObject(value, "plan")).toMatch(/sortable:\s*true/)
  })

  it("does not add a cell-based avatar column here — that belongs to the Utilisateurs composition", () => {
    const block = dataTableGroupSource()
    expect(block).not.toMatch(/\bcell:/)
    expect(block).not.toMatch(/avatarSrc/)
  })
})
