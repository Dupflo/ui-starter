import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// T7 (s17-data-table) — SOURCE-LEVEL: this file imports `@/components/ui/
// button` → `@/i18n/navigation` → next-intl's `createNavigation` →
// "next/navigation", the same import chain components-map.test.ts's header
// documents as unresolvable under this repo's Vitest config (no
// jsdom/happy-dom either) — so, like text-field-demo.tsx/modal-demo.tsx,
// this is a source-text guard, not a render.
//
// What this pins is the story's own framing for the "Utilisateurs" block:
// a COMPOSITION on DataTable (Badge for status, a real Button for the row
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

const source = readFileSync(
  fileURLToPath(new URL("./data-table-users-demo.tsx", import.meta.url)),
  "utf8",
)

describe("DataTableUsersDemo — a composition, not a second component (T7/s17, updated T5/s18)", () => {
  it('is a Client Component ("use client")', () => {
    expect(source.trimStart()).toMatch(/^"use client"/)
  })

  it("composes DataTable, Badge, Button and Avatar — the composition, not DataTable, owns these imports", () => {
    expect(source).toMatch(/from ["']@\/components\/ui\/data-table["']/)
    expect(source).toMatch(/from ["']@\/components\/ui\/badge["']/)
    expect(source).toMatch(/from ["']@\/components\/ui\/button["']/)
    expect(source).toMatch(/from ["']@\/components\/ui\/avatar["']/)
  })

  it("supplies exactly 3 custom `cell` renderers (avatar, status badge, actions) — name/role fall back to the default text render; a column dropping its override silently is the regression this pins", () => {
    const cellOccurrences = source.match(/\bcell:\s*\(/g) ?? []
    expect(cellOccurrences).toHaveLength(3)
  })

  it("renders status through Badge (not a raw coloured span)", () => {
    expect(source).toMatch(/<Badge\s+tone=/)
  })

  it("renders the row action through Button (not a bare <button>)", () => {
    expect(source).toMatch(/<Button\b/)
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
