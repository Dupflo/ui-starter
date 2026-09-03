"use client"

import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/ui/data-table"
import { AVATAR_DEMO_IMAGES } from "@/components/gallery/avatar-fixtures"

type UserRow = {
  id: string
  name: string
  role: string
  statusLabel: string
  statusTone: "success" | "warning" | "danger"
  /** Absent on purpose for two of the four demo rows — `Avatar` falls back
   *  to initials for those, so this one table demonstrates BOTH of the
   *  primitive's two states, not just the one with an image. */
  avatarSrc?: string
}

export type DataTableUsersLabels = {
  caption: string
  columnAvatar: string
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

/**
 * T7 (s17-data-table), avatar column updated by T5 (s18-ui-kit-polish,
 * annotation `mtlqxys25i7`) — the "Utilisateurs" block: a COMPOSITION on
 * `DataTable`, not a second table component (docs/stories.md AC). `Column`
 * `cell` is where that composition happens — a dedicated `Avatar` column
 * (image on two rows, initials fallback on the other two — see `UserRow`'s
 * doc comment), a `Badge` for status, and a real `Button` for the row
 * action. `components/ui/data-table.tsx` itself never imports Badge/Avatar/
 * Button (data-table.test.ts's source-level check) — this file is where
 * those imports actually live.
 *
 * The avatar is `decorative`: the row's name is already visible, as text,
 * in its own "Utilisateur" column on the SAME row — without `decorative` a
 * screen reader would announce the person's name twice per row. Contrast
 * the standalone `Avatar` example in primitives-section.tsx, which has no
 * adjacent visible name and therefore IS the informational case (a real
 * accessible name, no `decorative`) — see avatar.tsx's own doc comment for
 * the two states.
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
      avatarSrc: AVATAR_DEMO_IMAGES.camille,
    },
    {
      id: "2",
      name: labels.row2Name,
      role: labels.row2Role,
      statusLabel: labels.row2Status,
      statusTone: "warning",
      avatarSrc: AVATAR_DEMO_IMAGES.yanis,
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
      // No natural sort/display value of its own — `key` still has to name
      // a real Row field to satisfy Column<Row> (T1), so this reuses
      // `avatarSrc`; `cell` is what actually renders here.
      key: "avatarSrc",
      header: labels.columnAvatar,
      cell: (row) => <Avatar src={row.avatarSrc} name={row.name} decorative />,
    },
    { key: "name", header: labels.columnUser, sortable: true },
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
