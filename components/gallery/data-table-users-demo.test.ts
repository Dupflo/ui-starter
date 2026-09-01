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
// action, an avatar built from plain tokens — no Avatar primitive exists in
// the design system, and none is invented here), never a second table
// component, and never something `components/ui/data-table.tsx` itself
// knows about (see data-table.test.ts's "imports no components/ui
// primitive of its own" check for the other half of this guarantee).

const source = readFileSync(
  fileURLToPath(new URL("./data-table-users-demo.tsx", import.meta.url)),
  "utf8",
)

describe("DataTableUsersDemo — a composition, not a second component (T7)", () => {
  it('is a Client Component ("use client")', () => {
    expect(source.trimStart()).toMatch(/^"use client"/)
  })

  it("composes DataTable, Badge and Button — the composition, not DataTable, owns these imports", () => {
    expect(source).toMatch(/from ["']@\/components\/ui\/data-table["']/)
    expect(source).toMatch(/from ["']@\/components\/ui\/badge["']/)
    expect(source).toMatch(/from ["']@\/components\/ui\/button["']/)
  })

  it("supplies exactly 3 custom `cell` renderers (user/avatar, status badge, actions) — a column dropping its override silently is the regression this pins", () => {
    const cellOccurrences = source.match(/\bcell:\s*\(/g) ?? []
    expect(cellOccurrences).toHaveLength(3)
  })

  it("renders status through Badge (not a raw coloured span)", () => {
    expect(source).toMatch(/<Badge\s+tone=/)
  })

  it("renders the row action through Button (not a bare <button>)", () => {
    expect(source).toMatch(/<Button\b/)
  })

  it("does not invent an Avatar component — the avatar is plain tokens (rounded-full), same precedent as the pricing block's spacing div in blocks-section.tsx", () => {
    expect(source).not.toMatch(/from ["']@\/components\/ui\/avatar["']/)
    expect(source).not.toMatch(/<Avatar\b/)
    expect(source).toMatch(/rounded-full/)
  })
})
