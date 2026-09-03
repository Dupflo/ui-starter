import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"
import { ActionMenu, type ActionMenuItem } from "./action-menu"

// s19-action-menu — like data-table.tsx (see that file's test header), and
// unlike combobox.tsx/select.tsx, action-menu.tsx imports nothing but React,
// react-dom's `createPortal` and `lib/cn`: no next-intl, no
// "@/i18n/navigation". `react-dom/server`'s `renderToStaticMarkup` genuinely
// works here for the TRIGGER (always in the normal render tree, never
// portaled) — so the first block below renders REAL output and asserts on
// the REAL resulting HTML, not source text.
//
// The OPEN menu itself is a different story: T4 portals it into
// `document.body` to escape DataTable's `overflow-x-auto` (see
// action-menu.tsx's own doc comment) — `document` does not exist under this
// repo's node-only Vitest environment (no jsdom/happy-dom,
// components-map.test.ts's header), and cannot exist during real SSR either
// (Next still server-renders "use client" components for their first HTML).
// `open` only ever becomes `true` from a browser event handler (no
// `defaultOpen` prop — deliberately, see the doc comment), so the portal
// branch is simply unreachable here: `renderToStaticMarkup` below exercises
// only the closed state, by construction, and the menu content itself is
// pinned at the source level in the second block (same convention as
// combobox.test.ts).

const items: ActionMenuItem[] = [
  { key: "view", label: "View" },
  { key: "edit", label: "Edit", disabled: true },
  { key: "delete", label: "Delete", destructive: true },
]

function renderTrigger(
  overrides: Partial<Parameters<typeof ActionMenu>[0]> = {},
) {
  return renderToStaticMarkup(
    createElement(ActionMenu, { label: "Actions", items, ...overrides }),
  )
}

describe("ActionMenu trigger — real render (react-dom/server)", () => {
  it("renders a <button> carrying a real accessible name via aria-label (never an optional placeholder — s14 lesson)", () => {
    const html = renderTrigger({ label: "Actions pour Camille Girard" })
    expect(html).toMatch(/<button[^>]*aria-label="Actions pour Camille Girard"/)
  })

  it('wires aria-haspopup="menu"', () => {
    const html = renderTrigger()
    expect(html).toContain('aria-haspopup="menu"')
  })

  it('starts with aria-expanded="false" (closed by default — no defaultOpen prop)', () => {
    const html = renderTrigger()
    expect(html).toMatch(/<button[^>]*aria-expanded="false"/)
  })

  it('never renders role="menu" while closed (the menu is portal-only and only ever mounts once `open` is true)', () => {
    const html = renderTrigger()
    expect(html).not.toContain('role="menu"')
  })

  it('defaults to type="button" (never submits an ambient <form>)', () => {
    const html = renderTrigger()
    expect(html).toMatch(/<button[^>]*type="button"/)
  })
})

// ─── source-level: the menu content itself (portal-only, see header) ──────

const source = readFileSync(
  fileURLToPath(new URL("./action-menu.tsx", import.meta.url)),
  "utf8",
)

describe("ActionMenu — menu content and behaviour (source-level, see file header for why)", () => {
  it("is a Client Component (stateful: open)", () => {
    expect(source.trimStart()).toMatch(/^"use client"/)
  })

  it('renders a role="menu" popup', () => {
    expect(source).toMatch(/role=["']menu["']/)
  })

  it('renders role="menuitem" children', () => {
    expect(source).toMatch(/role=["']menuitem["']/)
  })

  it("wires aria-disabled from item.disabled", () => {
    expect(source).toMatch(/aria-disabled=\{item\.disabled/)
  })

  it("gives a destructive item a distinct (danger) rendering", () => {
    expect(source).toMatch(/item\.destructive[\s\S]{0,40}text-danger/)
  })

  it("handles ArrowDown, ArrowUp, Home, End and Escape for keyboard roving + close", () => {
    for (const key of ["ArrowDown", "ArrowUp", "Home", "End", "Escape"]) {
      expect(source).toContain(`"${key}"`)
    }
  })

  it("closes on outside click via a document-level mousedown listener", () => {
    expect(source).toContain('addEventListener("mousedown"')
  })

  it("returns focus to the trigger on close (closeAndReturnFocus calls triggerRef.current?.focus())", () => {
    expect(source).toMatch(/triggerRef\.current\?\.focus\(\)/)
  })

  it("escapes DataTable's overflow-x-auto clipping (T4) by portaling the menu into document.body", () => {
    expect(source).toContain("createPortal")
    expect(source).toMatch(/createPortal\(\s*[\s\S]*?document\.body/)
  })

  it("positions the portaled menu from the trigger's own getBoundingClientRect, not a fixed guess", () => {
    expect(source).toContain("getBoundingClientRect")
  })
})

// ─── fix mode (review findings) ────────────────────────────────────────────
// Real-browser proof lives in the story report (see docs/reviews/s19-action-
// menu.md and the fix report) — this repo has no jsdom/happy-dom (see this
// file's header), so these stay source-level like every other assertion
// above. Regexes below are written to PIN THE EXACT SHAPE of the fix, not
// just its presence, precisely so the mutations the review demonstrated
// (removing the disabled guard, flipping Home to focus the last item, an
// optional `label` with an "Actions" default) change the source text enough
// to fail — the earlier, looser assertions above ("Home" merely appearing
// as a string) could not tell those mutations apart.

describe("ActionMenu — fix mode: dark mode reaches the portal (MAJOR 1)", () => {
  it("reads dark-mode state from the TRIGGER's own ancestry (.dark is a class on the app-shell wrapper, never <html> — app/globals.css), not a hook: the portal lands on document.body, outside that subtree", () => {
    expect(source).toMatch(/trigger\.closest\(["']\.dark["']\)/)
  })

  it("re-applies `dark` on the portaled menu element itself via classList (a direct DOM mutation, same T4 rationale as `style.top`/`style.left` — no new react-hooks/set-state-in-effect cost)", () => {
    expect(source).toMatch(/menu\.classList\.toggle\(\s*["']dark["']\s*,/)
  })
})

describe("ActionMenu — fix mode: left-edge clamp (MAJOR 2)", () => {
  it("measures the menu's own rendered width before positioning it (not an unmeasured guess)", () => {
    expect(source).toContain("getBoundingClientRect().width")
  })

  it("clamps the computed left edge between a viewport-relative minimum and maximum — the missing half of the earlier right-only anchor (measured -95px to -87px off-screen at 390-1024 before this fix)", () => {
    expect(source).toMatch(/Math\.min\(\s*Math\.max\(/)
  })
})

describe("ActionMenu — fix mode: focus survives a scroll/resize close (MAJOR 3)", () => {
  it("returns focus to the trigger when scroll/resize force-closes the menu (closeAndReturnFocus, not a bare setOpen(false) that drops focus onto <body>)", () => {
    expect(source).toMatch(
      /const onViewportChange = \(\) => closeAndReturnFocus\(\)/,
    )
  })
})

describe("ActionMenu — fix mode: document-level Escape (MINOR 3)", () => {
  it("also closes on a document-level Escape keydown — LocaleMenu's own precedent (components/ui/locale-menu.tsx) — so Escape still works if focus ever leaves the menu without closing it first", () => {
    expect(source).toMatch(
      /const onKeyDown = \(e: globalThis\.KeyboardEvent\) => \{\s*if \(e\.key === "Escape"\) closeAndReturnFocus\(\)\s*\}\s*document\.addEventListener\(\s*["']keydown["']/,
    )
  })
})

describe("ActionMenu — fix mode: Tab does not strand the menu open (MINOR 4)", () => {
  it('closes (without hijacking the browser\'s own Tab focus move) on "Tab" leaving an item — otherwise the menu stays visibly open, disconnected from focus (reproduced: focus landed on an unrelated <select> elsewhere on the page)', () => {
    const tabBlock = source.match(/case "Tab":[\s\S]{0,1200}?return/)?.[0]
    expect(tabBlock, "expected a Tab case block").toBeTruthy()
    // The only CODE lines in the block (not counting the doc comment,
    // which mentions both alternatives while explaining why they were
    // rejected) — pinned as consecutive lines to exclude a match inside
    // the comment prose.
    expect(tabBlock).toMatch(/^\s*setOpen\(false\)\n\s*return$/m)
  })
})

describe("ActionMenu — fix mode: guards re-armed to observe the exact mutations the review demonstrated (MINOR 1)", () => {
  it("handleSelect's disabled guard precedes onSelect/closeAndReturnFocus — pinned as one block, not just the presence of `item.disabled` (the review's mutation: delete the guard line, 15/15 passed before)", () => {
    expect(source).toMatch(
      /function handleSelect\(item: ActionMenuItem\) \{\s*if \(item\.disabled\) return\s*item\.onSelect\?\.\(\)\s*closeAndReturnFocus\(\)\s*\}/,
    )
  })

  it('"Home" focuses index 0 — pinned distinctly from "End" (the review\'s mutation: make "Home" focus the LAST item, 15/15 passed before)', () => {
    const homeBlock = source.match(/case "Home":[\s\S]{0,80}?return/)?.[0]
    expect(homeBlock, "expected a Home case block").toBeTruthy()
    expect(homeBlock).toMatch(/itemRefs\.current\[0\]\?\.focus\(\)/)
    expect(homeBlock).not.toMatch(/items\.length - 1/)
  })

  it('"label" is a required prop with no fallback default — never `label?:` nor `label = "Actions"` (the review\'s mutation: an optional label defaulting to "Actions", the literal s14 regression, 15/15 passed before)', () => {
    expect(source).toMatch(/^\s*label: string\s*$/m)
    expect(source).not.toMatch(/label\?:/)
    expect(source).not.toMatch(/label\s*=\s*["'`]Actions["'`]/)
  })
})
