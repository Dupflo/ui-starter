"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/ui/data-table"

type UserRow = {
  id: string
  name: string
  role: string
  statusLabel: string
  statusTone: "success" | "warning" | "danger"
}

export type DataTableUsersLabels = {
  caption: string
  columnUser: string
  columnRole: string
  columnStatus: string
  columnActions: string
  actionView: string
  row1Name: string
  row1Role: string
  row1Status: string
  row2Name: string
  row2Role: string
  row2Status: string
  row3Name: string
  row3Role: string
  row3Status: string
  row4Name: string
  row4Role: string
  row4Status: string
  loadingLabel: string
  emptyLabel: string
  previousLabel: string
  nextLabel: string
  pageOfTemplate: string
}

/** Initials for the avatar — first letter of each of the first two words. */
function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

/**
 * T7 (s17-data-table) — the "Utilisateurs" block: a COMPOSITION on
 * `DataTable`, not a second table component (docs/stories.md AC). `Column`
 * `cell` is where that composition actually happens — an avatar (plain
 * tokens: `rounded-full` + initials, no `Avatar` primitive exists in the
 * design system and none is invented here), a `Badge` for status, and a
 * real `Button` for the row action. `components/ui/data-table.tsx` itself
 * never imports Badge/Avatar/Button (data-table.test.ts's source-level
 * check) — this file is where those imports actually live.
 *
 * ESCAPE HATCH boundary: `columns` below carries `cell` closures (plain
 * functions) — React/Next refuses a bare function prop passed from a
 * Server Component's render pass into a Client Component element (the same
 * root cause as TextField's ref-bearing `registration`, see
 * components/gallery/text-field-demo.tsx's own comment). Building the
 * whole column/row tree INSIDE this "use client" module, instead of
 * receiving it as props from blocks-section.tsx, is what avoids that —
 * blocks-section.tsx reaches this only through the `render` escape hatch
 * (see its own comment there for the bumped escape-hatch.test.ts count).
 */
export function DataTableUsersDemo({
  labels,
}: {
  labels: DataTableUsersLabels
}) {
  const rows: UserRow[] = [
    {
      id: "1",
      name: labels.row1Name,
      role: labels.row1Role,
      statusLabel: labels.row1Status,
      statusTone: "success",
    },
    {
      id: "2",
      name: labels.row2Name,
      role: labels.row2Role,
      statusLabel: labels.row2Status,
      statusTone: "warning",
    },
    {
      id: "3",
      name: labels.row3Name,
      role: labels.row3Role,
      statusLabel: labels.row3Status,
      statusTone: "success",
    },
    {
      id: "4",
      name: labels.row4Name,
      role: labels.row4Role,
      statusLabel: labels.row4Status,
      statusTone: "danger",
    },
  ]

  const columns: Column<UserRow>[] = [
    {
      key: "name",
      header: labels.columnUser,
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fill text-xs font-semibold text-ink"
          >
            {initials(row.name)}
          </span>
          <span className="font-medium text-ink">{row.name}</span>
        </div>
      ),
    },
    { key: "role", header: labels.columnRole, sortable: true },
    {
      key: "statusLabel",
      header: labels.columnStatus,
      sortable: true,
      cell: (row) => <Badge tone={row.statusTone}>{row.statusLabel}</Badge>,
    },
    {
      // No natural data field for a row action — `key` still has to name a
      // real Row field to satisfy Column<Row> (T1), so this reuses `id`;
      // `cell` is what actually renders here, `id`'s raw value never shows.
      key: "id",
      header: labels.columnActions,
      align: "end",
      cell: () => (
        <Button size="sm" variant="subtle">
          {labels.actionView}
        </Button>
      ),
    },
  ]

  return (
    <DataTable
      caption={labels.caption}
      columns={columns}
      rows={rows}
      rowKey="id"
      pageSize={3}
      loadingLabel={labels.loadingLabel}
      emptyLabel={labels.emptyLabel}
      paginationLabels={{
        previous: labels.previousLabel,
        next: labels.nextLabel,
        pageOfTemplate: labels.pageOfTemplate,
      }}
    />
  )
}
