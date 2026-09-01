"use client"

import { useMemo, useState, type ReactNode } from "react"
import { cn } from "@/lib/cn"

// T1 (s17-data-table) — the whole point of this file. `key: keyof Row &
// string` ties every column to a real field of `Row`: referencing a key
// absent from `Row` is a TypeScript COMPILE ERROR, not a silent `undefined`
// at runtime. Proof: docs/plans/s17-data-table.md's own verification step
// (write a column referencing a key that doesn't exist on the fixture Row,
// run `npm run typecheck`, watch it fail — see the story report for the
// exact transcript), and the permanent `@ts-expect-error` fixture in
// data-table.test.ts, which turns "the invariant silently stops holding"
// into a typecheck failure of its own (an unused `@ts-expect-error`
// directive is itself an error).
//
// `cell` is the ONLY way a column renders anything beyond the default
// `String(row[key])` (T6) — this file never imports Badge, Avatar or
// Button itself (pinned by data-table.test.ts's source-level check):
// composing those belongs to the caller. See
// components/gallery/data-table-users-demo.tsx for the "Utilisateurs"
// composition.
export type Column<Row> = {
  key: keyof Row & string
  header: string
  sortable?: boolean
  align?: "start" | "end"
  cell?: (row: Row) => ReactNode
}

export type SortDirection = "asc" | "desc"
// Generic over Row for the same reason Column.key is (T1) — this shipped as
// bare `{ key: string; direction }` (docs/reviews/s17-data-table.md, MAJOR):
// `defaultSort={{ key: "typo", direction: "asc" }}` against a Row without
// that field compiled clean and was a silent no-op at runtime (every row
// compared equal, no header ever matched, aria-sort stayed "none"
// everywhere). Pinned by the second `@ts-expect-error` fixture in
// data-table.test.ts, same mechanism as Column.key above.
export type DataTableSort<Row> = {
  key: keyof Row & string
  direction: SortDirection
}

export type DataTablePaginationLabels = {
  previous: string
  next: string
  /** i18n template with literal "{page}" and "{total}" placeholders,
   *  interpolated here — same convention as Combobox's `resultsLabel`
   *  (components/ui/combobox.tsx). */
  pageOfTemplate: string
}

// Sorts by the column's RAW row value (never the rendered `cell` output) —
// a status column rendered as a `<Badge>` still sorts on the underlying
// string, not on serialized JSX. Numbers compare numerically (avoids the
// classic "9" > "40" lexicographic bug); everything else falls back to
// locale string comparison.
//
// The locale is pinned to "en" explicitly (review, MINOR 6) instead of each
// environment's default: `String.prototype.localeCompare` with no locale
// argument resolves the JS engine's default locale, which is the server's
// Node process locale during SSR and the visitor's browser locale during
// hydration — two different values in general. Nothing in this repo passes
// `defaultSort` today so the divergence isn't reachable yet, but a starter
// primitive that silently disagrees with itself post-hydration the moment a
// caller does pass one is exactly the kind of bug this component exists to
// not have. Pinning to a fixed locale keeps server and client running the
// identical comparison; it is not locale-aware collation matching the
// active UI locale — that would need a `locale` prop threaded from the
// caller, which is a separate enhancement outside this story's scope.
function compareValues(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b
  if (typeof a === "boolean" && typeof b === "boolean") {
    return Number(a) - Number(b)
  }
  return String(a).localeCompare(String(b), "en")
}

// Review finding (MINOR 1): `String(null)` / `String(undefined)` render the
// literal words "null"/"undefined" — and nullable columns (last_login,
// deleted_at) are the norm, not the exception, in the SaaS screens this
// starter exists to build. Decision: a missing value renders as an em dash.
// `cell` remains the escape hatch for anything else (a badge, a "—" with a
// tooltip, whatever a specific screen needs).
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "–"
  return String(value)
}

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  caption,
  loading = false,
  loadingLabel,
  emptyLabel,
  pageSize = 10,
  defaultSort,
  defaultPage = 1,
  paginationLabels,
}: {
  columns: Column<Row>[]
  rows: Row[]
  /** The Row field whose value is a stable, unique per-row identifier (used
   *  as the React key). A callback prop here (`(row: Row) => string |
   *  number`) would be the more familiar shape, but this component is
   *  rendered directly from a Server Component in the gallery's bare
   *  primitive demo (no client wrapper — see components/gallery/
   *  primitives-section.tsx's DataTable entry): React/Next refuses a bare
   *  function passed as a prop across that Server→Client boundary
   *  ("Functions cannot be passed directly to Client Components"),
   *  reproduced with a real `DEMO_MODE=1 next build` while this was still a
   *  callback. A field name is fully serializable and reuses the exact
   *  `keyof Row & string` shape `Column.key` already relies on (T1). */
  rowKey: keyof Row & string
  /** Always rendered as a visually-hidden <caption> — the table's real
   *  accessible name. Required, never optional-with-a-fallback: s14 shipped
   *  a control whose name silently came from an optional `placeholder`
   *  (docs/reviews/s14-dataviz-and-combobox.md, major finding) — nothing
   *  here is allowed to end up nameless by omission. */
  caption: string
  loading?: boolean
  loadingLabel: string
  emptyLabel: string
  pageSize?: number
  defaultSort?: DataTableSort<Row>
  defaultPage?: number
  paginationLabels: DataTablePaginationLabels
}) {
  const [sort, setSort] = useState<DataTableSort<Row> | undefined>(defaultSort)
  const [page, setPage] = useState(defaultPage)

  function toggleSort(key: keyof Row & string) {
    // T4 decision: a resort always jumps back to page 1 — staying on a
    // mid-list page after a resort would show rows unrelated to what the
    // user just asked to see, with nothing telling them why.
    setPage(1)
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: "asc" }
      return { key, direction: prev.direction === "asc" ? "desc" : "asc" }
    })
  }

  const sortedRows = useMemo(() => {
    if (!sort) return rows
    const factor = sort.direction === "asc" ? 1 : -1
    return [...rows].sort(
      (a, b) => factor * compareValues(a[sort.key], b[sort.key]),
    )
  }, [rows, sort])

  // Review finding (MINOR 2): Math.ceil(n / 0) is Infinity — pageSize=0
  // (or negative) would produce an empty slice and a "Page 1 / Infinity"
  // label while real rows exist. Clamp to a minimum of 1.
  const effectivePageSize = Math.max(1, pageSize)
  const totalPages = Math.max(
    1,
    Math.ceil(sortedRows.length / effectivePageSize),
  )
  const clampedPage = Math.min(Math.max(1, page), totalPages)
  const pageRows = sortedRows.slice(
    (clampedPage - 1) * effectivePageSize,
    clampedPage * effectivePageSize,
  )

  const pageOfLabel = paginationLabels.pageOfTemplate
    .replace("{page}", String(clampedPage))
    .replace("{total}", String(totalPages))

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-paper">
      {/* T8 — responsive decision: horizontal scroll on narrow viewports,
          table semantics kept intact (a "cards on mobile" adaptation would
          need its own accessible structure and is out of this story's
          scope — see docs/design-system.md's DataTable section). */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line">
              {columns.map((column, i) => {
                const activeSort =
                  sort && sort.key === column.key ? sort : undefined
                const ariaSort = column.sortable
                  ? activeSort
                    ? activeSort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                  : undefined
                return (
                  <th
                    key={`${column.key}-${i}`}
                    scope="col"
                    aria-sort={ariaSort}
                    className={cn(
                      "px-4 py-3 text-xs font-semibold text-muted",
                      column.align === "end" ? "text-end" : "text-start",
                    )}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className="inline-flex items-center gap-1 rounded-sm text-xs font-semibold text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/60"
                      >
                        {column.header}
                        <span aria-hidden="true" className="text-2xs">
                          {activeSort
                            ? activeSort.direction === "asc"
                              ? "↑"
                              : "↓"
                            : "↕"}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-6 text-center text-sm text-muted"
                >
                  {loadingLabel}
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-6 text-center text-sm text-muted"
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={String(row[rowKey])} className="hover:bg-fill/60">
                  {columns.map((column, i) => (
                    <td
                      key={`${column.key}-${i}`}
                      className={cn(
                        "px-4 py-3 text-ink",
                        column.align === "end" ? "text-end" : "text-start",
                      )}
                    >
                      {column.cell
                        ? column.cell(row)
                        : formatCellValue(row[column.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!loading && sortedRows.length > 0 ? (
        <div className="flex items-center justify-between gap-4 border-t border-line px-4 py-3">
          <span className="text-xs text-muted">{pageOfLabel}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={clampedPage <= 1}
              onClick={() => setPage(clampedPage - 1)}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/60 disabled:pointer-events-none disabled:opacity-50"
            >
              {paginationLabels.previous}
            </button>
            <button
              type="button"
              disabled={clampedPage >= totalPages}
              onClick={() => setPage(clampedPage + 1)}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/60 disabled:pointer-events-none disabled:opacity-50"
            >
              {paginationLabels.next}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
