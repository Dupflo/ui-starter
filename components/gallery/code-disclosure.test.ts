import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// T1/T2/T3 (s13-gallery-ergonomics) — `CodeDisclosure` is the collapsible
// footer `Example` delegates to: collapsed by default, a "Voir le code"
// button expands it, state is local to each mounted instance (React gives
// every hook call its own state by construction — no shared/module-level
// flag to probe).
//
// SOURCE-LEVEL, NOT A RUNTIME RENDER: `CodeDisclosure` composes `Button`,
// which imports `@/i18n/navigation` → next-intl's `createNavigation` →
// `next/navigation` — the same import chain components-map.test.ts's header
// documents as unresolvable under this repo's Vitest config. Every other
// gallery guard test (escape-hatch.test.ts, components-map.test.ts,
// app/[locale]/ui/page.test.ts) follows the same source-text convention for
// exactly that reason.

const source = readFileSync(
  fileURLToPath(new URL("./code-disclosure.tsx", import.meta.url)),
  "utf8",
)

describe("CodeDisclosure — collapsible code footer (s13-gallery-ergonomics)", () => {
  it("is a Client Component (local open/closed state)", () => {
    expect(source).toMatch(/^"use client"/)
  })

  it("holds its open/closed state in a hook (per-instance, not module-level)", () => {
    expect(source).toMatch(/useState\(false\)/)
  })

  it("T2: keeps the <code> block in the DOM unconditionally — collapse is a class toggle, not an unmount", () => {
    // The code element itself must be present in the JSX unconditionally...
    expect(source).toMatch(/<code>\{code\}<\/code>/)
    // ...and must NOT be gated behind a `{open && (...)}` conditional-render
    // guard, which would remove it from the server-rendered HTML entirely
    // and falsify s12's "chaque item expose son JSX" guarantee.
    expect(source).not.toMatch(/\{open\s*&&/)
    // The collapse must instead be a CSS visibility toggle.
    expect(source).toMatch(/open \? "block" : "hidden"/)
  })

  it("T3: the copy trigger is visible even while collapsed (copying without reading is a real use case)", () => {
    const copyIndex = source.indexOf("<CopyButton")
    const panelIndex = source.indexOf('open ? "block" : "hidden"')
    expect(copyIndex).toBeGreaterThan(-1)
    expect(panelIndex).toBeGreaterThan(-1)
    // The copy button must appear (in source order, i.e. in the always-shown
    // header) before the collapsible panel div.
    expect(copyIndex).toBeLessThan(panelIndex)
  })

  it("wires aria-expanded/aria-controls between the toggle and the panel it controls", () => {
    expect(source).toMatch(/aria-expanded=\{open\}/)
    expect(source).toMatch(/aria-controls=\{panelId\}/)
    expect(source).toMatch(/id=\{panelId\}/)
  })

  it("composes the existing Button primitive for the toggle (no ad hoc <button>)", () => {
    expect(source).toMatch(
      /import\s*\{\s*Button\s*\}\s*from\s*["']@\/components\/ui\/button["']/,
    )
  })

  it("labels are props, not hardcoded copy (i18n)", () => {
    expect(source).not.toMatch(/>Voir le code</)
    expect(source).not.toMatch(/>Masquer le code</)
    expect(source).toMatch(/labels\.codeShow/)
    expect(source).toMatch(/labels\.codeHide/)
  })
})
