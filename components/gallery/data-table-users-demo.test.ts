import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// T7 (s17-data-table) — SOURCE-LEVEL, kept for consistency with the rest of
// this file's tests even though it is no longer strictly required: this
// file used to import `@/components/ui/button` → `@/i18n/navigation` →
// next-intl's `createNavigation` → "next/navigation" (the import chain
// components-map.test.ts's header documents as unresolvable under this
// repo's Vitest config, no jsdom/happy-dom either). s19-action-menu (below)
// replaced that `Button` with `ActionMenu`, which imports nothing but
// React, react-dom's `createPortal` and `lib/cn` — so this file may now be
// import-free of that chain (probed standalone: it renders). Left
// source-level rather than converted to a `renderToStaticMarkup` render:
// that conversion is a bigger change than this story's T5 (an
// integration, not a test-methodology rewrite of a prior story's file) —
// worth revisiting in a future story.
//
// What this pins is the story's own framing for the "Utilisateurs" block:
// a COMPOSITION on DataTable (Badge for status, an ActionMenu for the row
// action, `Avatar` for the row's photo — see below — never something
// `components/ui/data-table.tsx` itself knows about (data-table.test.ts's
// "imports no components/ui primitive of its own" check is the other half
// of that guarantee), and never a second table component.
//
// SUPERSEDES s17's "no Avatar primitive exists, none invented here" —
// s18-ui-kit-polish (annotation `mtlqxys25i7`, "ajoute … une colonne
// avatar avec des images") introduced `components/ui/avatar.tsx`; this
// block is updated to use the real primitive instead of the plain-tokens
// initials span it composed by hand before one existed.
//
// SUPERSEDES s18's "renders the row action through Button" — s19-action-menu
// (annotation `mtlqyltsxz8`, "rajoute une barre d'outil ⋮ vertical avec des
// actions") replaces the lone "Voir" Button with an ActionMenu offering
// view/edit/delete, the edit action disabled for the suspended row (a real
// instance of the story's disabled-state AC) and delete marked destructive.
// `onSelect` is left unwired on every action, same as the "Voir" Button it
// replaces had no `onClick` — this gallery composition has no backend to
// act against.

const source = readFileSync(
  fileURLToPath(new URL("./data-table-users-demo.tsx", import.meta.url)),
  "utf8",
)

describe("DataTableUsersDemo — a composition, not a second component (T7/s17, updated T5/s18, T5/s19)", () => {
  it('is a Client Component ("use client")', () => {
    expect(source.trimStart()).toMatch(/^"use client"/)
  })

  it("composes DataTable, Badge, ActionMenu and Avatar — the composition, not DataTable, owns these imports", () => {
    expect(source).toMatch(/from ["']@\/components\/ui\/data-table["']/)
    expect(source).toMatch(/from ["']@\/components\/ui\/badge["']/)
    expect(source).toMatch(/from ["']@\/components\/ui\/action-menu["']/)
    expect(source).toMatch(/from ["']@\/components\/ui\/avatar["']/)
  })

  it("supplies exactly 3 custom `cell` renderers (avatar, status badge, actions) — name/role fall back to the default text render; a column dropping its override silently is the regression this pins", () => {
    const cellOccurrences = source.match(/\bcell:\s*\(/g) ?? []
    expect(cellOccurrences).toHaveLength(3)
  })

  it("renders status through Badge (not a raw coloured span)", () => {
    expect(source).toMatch(/<Badge\s+tone=/)
  })

  it("renders the row action through ActionMenu (not a bare Button anymore)", () => {
    expect(source).toMatch(/<ActionMenu\b/)
    expect(source).not.toMatch(/<Button\b/)
  })

  it("gives each row's ActionMenu trigger a per-row accessible name (not the same generic label repeated identically on every row)", () => {
    const actionMenuTag = source.match(/<ActionMenu\b[^>]*>/)?.[0]
    expect(actionMenuTag, "expected an <ActionMenu …> usage").toBeTruthy()
    expect(actionMenuTag).toMatch(/label=\{labels\.actionsLabelTemplate/)
    expect(actionMenuTag).toContain("row.name")
  })

  it('disables the edit action for the suspended user (statusTone === "danger") — the story\'s disabled-state AC, on a real row', () => {
    expect(source).toMatch(/disabled:\s*row\.statusTone\s*===\s*["']danger["']/)
  })

  it("marks the delete action destructive — the story's destructive-state AC", () => {
    expect(source).toMatch(
      /key:\s*["']delete["'][\s\S]{0,120}destructive:\s*true/,
    )
  })

  it("renders the dedicated avatar column through the real Avatar primitive, with a real image src on at least one row", () => {
    expect(source).toMatch(/<Avatar\b/)
    expect(source).toMatch(/avatarSrc/)
  })

  it("the avatar is decorative — a visible name already sits in its own column on the same row, so a screen reader must not hear it twice", () => {
    const avatarCellMatch = source.match(/<Avatar\b[^/]*\/>/)
    expect(
      avatarCellMatch,
      "expected a self-closing <Avatar … /> usage",
    ).not.toBeNull()
    expect(avatarCellMatch![0]).toMatch(/\bdecorative\b/)
  })
})
