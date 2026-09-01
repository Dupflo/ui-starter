import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"
import { DataTable, type Column, type DataTableSort } from "./data-table"

// s17-data-table — unlike every other components/ui/* colocated test in this
// repo (combobox.test.ts, select.test.ts, chart-*.test.ts — see
// components-map.test.ts's header for why), data-table.tsx imports nothing
// but React and lib/cn: no next-intl, no "@/i18n/navigation", none of the
// import chains that fail to resolve under this repo's Vitest config (no
// jsdom/happy-dom, node environment only). That means `react-dom/server`'s
// `renderToStaticMarkup` genuinely works here (probed standalone before
// writing anything else: a trivial component rendered and its HTML asserted
// on, green) — so these tests render REAL output and assert on the REAL
// resulting HTML (row order, aria-sort value, colspan, disabled state)
// instead of grepping source text for the presence of a string. This is
// deliberately the stronger guard the story asks for: six prior guards in
// this project were "true in isolation, none pinning the invariant" — every
// assertion below is paired with the mutation that was applied to prove it
// actually goes red (see the story report for the exact mutations run).

const source = readFileSync(
  fileURLToPath(new URL("./data-table.tsx", import.meta.url)),
  "utf8",
)

// ─── fixtures ───────────────────────────────────────────────────────────────

type Person = { id: string; name: string; age: number }

const rows: Person[] = [
  { id: "3", name: "Charlie", age: 40 },
  { id: "1", name: "Alice", age: 25 },
  { id: "2", name: "Bob", age: 30 },
]

const columns: Column<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "age", header: "Age", sortable: true, align: "end" },
]

type RenderProps = Parameters<typeof DataTable<Person>>[0]

function renderTable(overrides: Partial<RenderProps> = {}): string {
  const props: RenderProps = {
    columns,
    rows,
    rowKey: "id",
    caption: "People",
    loadingLabel: "Loading…",
    emptyLabel: "No data",
    paginationLabels: {
      previous: "Prev",
      next: "Next",
      pageOfTemplate: "Page {page} / {total}",
    },
    ...overrides,
  }
  return renderToStaticMarkup(createElement(DataTable<Person>, props))
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Every `<th ...>...</th>` in the rendered markup, split into its
 *  attribute string and inner HTML (used to read aria-sort per column and
 *  to check for a nested <button>). */
function theadCells(html: string): { attrs: string; inner: string }[] {
  const thead = html.match(/<thead[^>]*>([\s\S]*?)<\/thead>/)?.[1] ?? ""
  return [...thead.matchAll(/<th([^>]*)>([\s\S]*?)<\/th>/g)].map((m) => ({
    attrs: m[1],
    inner: m[2],
  }))
}

/** Every data row (`<tr>` inside `<tbody>`) as an array of its `<td>` inner
 *  HTML strings, in document order. */
function tbodyRows(html: string): string[][] {
  const tbody = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/)?.[1] ?? ""
  return [...tbody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(([, tr]) =>
    [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]),
  )
}

/** Attribute string of the single `<button>` whose visible text is exactly
 *  `label` — discriminates pagination buttons (plain text) from sortable
 *  header buttons (which always nest an aria-hidden arrow span). */
function buttonAttrsForLabel(html: string, label: string): string | undefined {
  const re = new RegExp(`<button([^>]*)>${escapeRegExp(label)}</button>`)
  return html.match(re)?.[1]
}

// ─── T1 — the compile-time proof ───────────────────────────────────────────
//
// Referencing a key absent from Row is a TypeScript compile error, not a
// silent `undefined` — proven manually per the plan (write the wrong case,
// run `npm run typecheck`, watch it fail, remove it; see the story report
// for that transcript) AND pinned here permanently: `@ts-expect-error`
// makes `tsc` itself the assertion — if `Column<Row>`'s `key` type is ever
// loosened back to `string`, the line below stops erroring and
// `@ts-expect-error` becomes an ERROR in its own right ("Unused
// '@ts-expect-error' directive"), so `npm run typecheck` fails either way.
// Not a runtime test — nothing to execute or watch fail under Vitest (esbuild
// strips types before this file ever runs); the failure mode lives entirely
// in `npm run typecheck`.
type ExampleRow = { id: string; name: string; role: string }
// @ts-expect-error — "email" is not a key of ExampleRow
const invalidColumn: Column<ExampleRow> = { key: "email", header: "Email" }
void invalidColumn

// Same proof for `defaultSort` — s17-data-table's review (docs/reviews/
// s17-data-table.md, MAJOR) found `DataTableSort.key` shipped as bare
// `string`, not `keyof Row & string`: `defaultSort={{ key: "emailAddress",
// direction: "asc" }}` against a `Row` with no such field compiled clean
// (exit 0) and was a silent runtime no-op (every row compares equal, no
// header ever matches `sort.key`, `aria-sort` stays "none" everywhere).
// `DataTableSort` is now generic over `Row` — this fixture is what keeps it
// that way: widen `DataTableSort<Row>`'s `key` back to plain `string` and
// this directive goes unused, which is itself a `tsc` error.
// @ts-expect-error — "email" is not a key of ExampleRow
const badSort: DataTableSort<ExampleRow> = { key: "email", direction: "asc" }
void badSort

// ─── behavioural tests (real render, real HTML) ────────────────────────────

describe("DataTable — accessible name (T2)", () => {
  it("renders a real <caption> carrying the required, non-optional label", () => {
    const html = renderTable({ caption: "People" })
    expect(html).toMatch(/<caption[^>]*>People<\/caption>/)
  })
})

describe("DataTable — semantic structure (T2)", () => {
  it("renders <thead>/<tbody> inside a <table>, headers scoped to their column", () => {
    const html = renderTable()
    expect(html).toMatch(/<table[^>]*>[\s\S]*<thead/)
    expect(html).toMatch(/<tbody/)
    const cells = theadCells(html)
    expect(cells).toHaveLength(2)
    for (const cell of cells) {
      expect(cell.attrs).toMatch(/scope="col"/)
    }
  })
})

describe("DataTable — sortable header is a real actionable control (T3)", () => {
  it("wraps a sortable column's header text in a real <button>, not a bare <th onClick>", () => {
    const html = renderTable()
    const cells = theadCells(html)
    // both fixture columns are sortable
    for (const cell of cells) {
      expect(cell.inner).toContain("<button")
    }
  })

  it("a non-sortable column's header carries no <button> at all", () => {
    const nonSortableColumns: Column<Person>[] = [
      { key: "name", header: "Name", sortable: false },
    ]
    const html = renderTable({ columns: nonSortableColumns })
    const [cell] = theadCells(html)
    expect(cell.inner).not.toContain("<button")
    expect(cell.inner).toContain("Name")
  })
})

describe("DataTable — aria-sort reflects real state (T3)", () => {
  it('every sortable column starts at aria-sort="none" with no defaultSort', () => {
    const html = renderTable()
    const cells = theadCells(html)
    for (const cell of cells) {
      expect(cell.attrs).toMatch(/aria-sort="none"/)
    }
  })

  it('the active column carries aria-sort="ascending", others stay "none"', () => {
    const html = renderTable({ defaultSort: { key: "name", direction: "asc" } })
    const [nameCell, ageCell] = theadCells(html)
    expect(nameCell.attrs).toMatch(/aria-sort="ascending"/)
    expect(ageCell.attrs).toMatch(/aria-sort="none"/)
  })

  it('the active column carries aria-sort="descending" for the desc direction', () => {
    const html = renderTable({
      defaultSort: { key: "age", direction: "desc" },
    })
    const [nameCell, ageCell] = theadCells(html)
    expect(nameCell.attrs).toMatch(/aria-sort="none"/)
    expect(ageCell.attrs).toMatch(/aria-sort="descending"/)
  })

  it("a non-sortable column never carries aria-sort at all", () => {
    const html = renderTable({
      columns: [{ key: "name", header: "Name", sortable: false }],
    })
    const [cell] = theadCells(html)
    expect(cell.attrs).not.toContain("aria-sort")
  })
})

describe("DataTable — sorting actually reorders the rendered rows (T3)", () => {
  // The point of this suite: aria-sort alone (above) could be wired to a
  // state variable that never touches row order — this proves the actual
  // <td> content comes out in the sorted sequence, on the real column
  // value, not the cell's rendered text.
  it("ascending by name puts Alice, Bob, Charlie in that literal order", () => {
    const html = renderTable({ defaultSort: { key: "name", direction: "asc" } })
    const names = tbodyRows(html).map((cells) => cells[0])
    expect(names).toEqual(["Alice", "Bob", "Charlie"])
  })

  it("descending by name reverses it", () => {
    const html = renderTable({
      defaultSort: { key: "name", direction: "desc" },
    })
    const names = tbodyRows(html).map((cells) => cells[0])
    expect(names).toEqual(["Charlie", "Bob", "Alice"])
  })

  it("sorts numerically on a number column (25, 30, 40), not lexicographically", () => {
    // Lexicographic sort of "25"/"30"/"40" happens to agree here — use a
    // fixture where it would NOT (e.g. 9 vs 40) to actually distinguish the
    // two algorithms.
    const numericRows: Person[] = [
      { id: "a", name: "A", age: 9 },
      { id: "b", name: "B", age: 40 },
      { id: "c", name: "C", age: 100 },
    ]
    const html = renderTable({
      rows: numericRows,
      defaultSort: { key: "age", direction: "asc" },
    })
    const ages = tbodyRows(html).map((cells) => cells[1])
    // Lexicographic order would be "100", "40", "9" — numeric is 9, 40, 100.
    expect(ages).toEqual(["9", "40", "100"])
  })
})

// KNOWN GAP, stated rather than papered over (review, "acknowledge, do not
// paper over"): the T4 decision that a resort jumps back to page 1
// (toggleSort's `setPage(1)`, data-table.tsx) is NOT guarded by any test
// below. Guarding it needs driving a real click/keypress on a sort header,
// observing the page state change — this suite renders once via
// `renderToStaticMarkup` (a static string, no event dispatch, no React
// reconciliation) precisely because `data-table.tsx` avoids the
// `@/i18n/navigation` import chain that breaks under this repo's Vitest
// config (see the file header above); that same absence of jsdom/
// testing-library/an event loop is what makes driving `setState` from here
// impossible. Deleting `setPage(1)` from `toggleSort` leaves every test in
// this file green — confirmed, not assumed. The decision was verified once
// on the real DOM (see docs/research/s17-data-table.md) instead.
describe("DataTable — pagination slices rows and disables edge controls (T4)", () => {
  it("page 1 of 3 (pageSize 2, 5 rows): first 2 rows, Prev disabled, Next enabled", () => {
    const fiveRows: Person[] = [1, 2, 3, 4, 5].map((n) => ({
      id: String(n),
      name: `Row ${n}`,
      age: n,
    }))
    const html = renderTable({ rows: fiveRows, pageSize: 2, defaultPage: 1 })
    const names = tbodyRows(html).map((cells) => cells[0])
    expect(names).toEqual(["Row 1", "Row 2"])
    expect(buttonAttrsForLabel(html, "Prev")).toMatch(/\bdisabled\b(?!:)/)
    expect(buttonAttrsForLabel(html, "Next")).not.toMatch(/\bdisabled\b(?!:)/)
    expect(html).toContain("Page 1 / 3")
  })

  it("page 2 of 3: rows 3-4, both controls enabled", () => {
    const fiveRows: Person[] = [1, 2, 3, 4, 5].map((n) => ({
      id: String(n),
      name: `Row ${n}`,
      age: n,
    }))
    const html = renderTable({ rows: fiveRows, pageSize: 2, defaultPage: 2 })
    const names = tbodyRows(html).map((cells) => cells[0])
    expect(names).toEqual(["Row 3", "Row 4"])
    expect(buttonAttrsForLabel(html, "Prev")).not.toMatch(/\bdisabled\b(?!:)/)
    expect(buttonAttrsForLabel(html, "Next")).not.toMatch(/\bdisabled\b(?!:)/)
    expect(html).toContain("Page 2 / 3")
  })

  it("page 3 of 3 (last, partial): 1 row, Next disabled, Prev enabled", () => {
    const fiveRows: Person[] = [1, 2, 3, 4, 5].map((n) => ({
      id: String(n),
      name: `Row ${n}`,
      age: n,
    }))
    const html = renderTable({ rows: fiveRows, pageSize: 2, defaultPage: 3 })
    const names = tbodyRows(html).map((cells) => cells[0])
    expect(names).toEqual(["Row 5"])
    expect(buttonAttrsForLabel(html, "Prev")).not.toMatch(/\bdisabled\b(?!:)/)
    expect(buttonAttrsForLabel(html, "Next")).toMatch(/\bdisabled\b(?!:)/)
    expect(html).toContain("Page 3 / 3")
  })

  // Review finding (MINOR 2): Math.ceil(n / 0) is Infinity, so the real
  // page slice (clampedPage - 1) * 0 .. clampedPage * 0 is always empty —
  // the empty state shows even though rows exist. pageSize is clamped to a
  // minimum of 1, so pageSize={0} behaves like pageSize={1}: one real row
  // per page, "Page 1 / 3", not "Page 1 / Infinity" hiding every row.
  it("pageSize={0} does not hide real rows behind Page 1 / Infinity", () => {
    const html = renderTable({ rows, pageSize: 0 })
    const names = tbodyRows(html).map((cells) => cells[0])
    expect(names).toEqual(["Charlie"])
    expect(html).toContain("Page 1 / 3")
    expect(html).not.toContain("Infinity")
    expect(html).not.toContain("No data")
  })
})

describe("DataTable — loading and empty states are distinct, and both stay a valid table (T5)", () => {
  it("loading=true shows exactly one row with the loading message, colSpan = column count, and hides real rows even if rows is non-empty", () => {
    const html = renderTable({ loading: true })
    const dataRows = tbodyRows(html)
    expect(dataRows).toHaveLength(1)
    expect(dataRows[0]).toHaveLength(1)
    expect(html).toMatch(/<td[^>]*colSpan="2"[^>]*>Loading…<\/td>/)
    // The real fixture rows (Alice/Bob/Charlie) must not leak through.
    expect(html).not.toContain("Alice")
    expect(html).not.toContain("Charlie")
  })

  it("rows=[] (not loading) shows exactly one row with the distinct empty message", () => {
    const html = renderTable({ rows: [] })
    const dataRows = tbodyRows(html)
    expect(dataRows).toHaveLength(1)
    expect(html).toMatch(/<td[^>]*colSpan="2"[^>]*>No data<\/td>/)
    expect(html).not.toContain("Loading…")
  })

  it("the loading message and the empty message are never both present", () => {
    const loadingHtml = renderTable({ loading: true })
    expect(loadingHtml).not.toContain("No data")
  })
})

describe("DataTable — custom cell rendering, without DataTable knowing the composed component (T6)", () => {
  it("a column with `cell` renders exactly what `cell` returns, not the raw value", () => {
    const withCustomCell: Column<Person>[] = [
      {
        key: "name",
        header: "Name",
        cell: (row) => createElement("strong", null, `custom:${row.name}`),
      },
    ]
    const html = renderTable({ columns: withCustomCell })
    expect(html).toContain("<strong>custom:Charlie</strong>")
  })

  it("a column with no `cell` falls back to String(row[key]) — proven on a non-string field", () => {
    const html = renderTable()
    const ages = tbodyRows(html).map((cells) => cells[1])
    expect(ages.sort()).toEqual(["25", "30", "40"])
  })

  // Review finding (MINOR 3): this guard used to check only
  // /(badge|button)/ against its own title's promise ("no components/ui
  // primitive of its own") — an added `import { Card } from
  // "@/components/ui/card"` left the suite green (proven: the review's
  // mutation, reproduced before this fix, added that import and reran the
  // suite — 23/23 still passed). Widened to match any `@/components/ui/*`
  // import, which is what the title actually claims.
  it("imports no components/ui primitive of its own — composition is the caller's job", () => {
    expect(source).not.toMatch(/from ["']@\/components\/ui\//)
  })

  // Review finding (docs/reviews/s17-data-table.md, MINOR 1): nullable
  // columns (last_login, deleted_at — the SaaS norm) are exactly where the
  // literal-`String()` default used to render the words "null"/"undefined"
  // into the table. Decision: a missing value renders as an em dash, never
  // the JS-ism.
  it("a null or undefined cell value renders as an em dash, never the literal word null/undefined", () => {
    type Nullable = { id: string; lastLogin: string | null | undefined }
    const nullableRows: Nullable[] = [
      { id: "1", lastLogin: null },
      { id: "2", lastLogin: undefined },
    ]
    const nullableColumns: Column<Nullable>[] = [
      { key: "lastLogin", header: "Last login" },
    ]
    const html = renderToStaticMarkup(
      createElement(DataTable<Nullable>, {
        columns: nullableColumns,
        rows: nullableRows,
        rowKey: "id",
        caption: "Nullable",
        loadingLabel: "Loading…",
        emptyLabel: "No data",
        paginationLabels: {
          previous: "Prev",
          next: "Next",
          pageOfTemplate: "Page {page} / {total}",
        },
      }),
    )
    const values = tbodyRows(html).map((cells) => cells[0])
    expect(values).toEqual(["–", "–"])
    expect(html).not.toContain("null")
    expect(html).not.toContain("undefined")
  })
})

describe("DataTable — is a Client Component (stateful: sort, page)", () => {
  it('starts with "use client"', () => {
    expect(source.trimStart()).toMatch(/^"use client"/)
  })
})
