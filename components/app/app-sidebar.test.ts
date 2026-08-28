import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { describe, it, expect } from "vitest"

// Source-level structural assertions for the app-sidebar component.
//
// WHY source-level (not DOM render):
// The repo runs vitest with `environment: node` (no testing-library/jsdom,
// no happy-dom). Adding a DOM runner would require a new npm dependency, which
// the s04 interdicts explicitly forbid. The established convention for
// component structural assertions in this codebase is source inspection
// (see components/brand/logo.test.ts). These tests prove the email IS threaded
// and written into the render path, and that logout is wired — but not at
// pixel-level. If a true render assertion is ever needed, that is a dependency
// decision for a future story (new vitest environment), not s04.
//
// AC1 is already pinned by proxy.test.ts:57-77 — this file does NOT duplicate it.

const sidebarSource = readFileSync(
  path.join(fileURLToPath(new URL(".", import.meta.url)), "app-sidebar.tsx"),
  "utf8",
)

const shellSource = readFileSync(
  path.join(fileURLToPath(new URL(".", import.meta.url)), "app-shell.tsx"),
  "utf8",
)

const mobileSidebarSource = readFileSync(
  path.join(fileURLToPath(new URL(".", import.meta.url)), "mobile-sidebar.tsx"),
  "utf8",
)

// ─── AC2: threading — email destructured from context and rendered ────────────

describe("app-sidebar — AC2: email threading", () => {
  it("destructures email from useAppUser()", () => {
    // The destructuring must include `email` alongside `name`/`initials`/`photoUrl`.
    expect(
      sidebarSource,
      "app-sidebar.tsx must destructure `email` from useAppUser() — AC2 requires the email to be threaded from context into the badge",
    ).toMatch(/const\s*\{[^}]*\bemail\b[^}]*\}\s*=\s*useAppUser\(\)/)
  })

  it("renders email inside the badge (the {email … } expression is present)", () => {
    // A conditional render like `{email ? ... : null}` must appear in the source.
    expect(
      sidebarSource,
      'app-sidebar.tsx must render `email` inside the badge — AC2 "email affiché" requires a visible email line in the expanded sidebar badge',
    ).toMatch(/\{email\s*\?/)
  })

  it("logout button is wired with onClick={logout}", () => {
    expect(
      sidebarSource,
      "app-sidebar.tsx must wire the logout button with onClick={logout}",
    ).toContain("onClick={logout}")
  })

  it('logout button has aria-label={t("logout")}', () => {
    expect(
      sidebarSource,
      'app-sidebar.tsx must keep aria-label={t("logout")} on the logout button',
    ).toContain('aria-label={t("logout")}')
  })
})

// ─── AC2: AppUser type declares email ─────────────────────────────────────────

describe("app-shell — AppUser type declares email", () => {
  it("AppUser type includes an email field", () => {
    expect(
      shellSource,
      "app-shell.tsx AppUser type must declare an `email` field — it is the single source of the AC2 email thread",
    ).toMatch(/\bemail\b\s*\??\s*:/)
  })
})

// ─── AC3: no raw colours in the edited file ───────────────────────────────────

describe("app-sidebar — AC3: tokens-only (no raw colour)", () => {
  // WHY this test (and why it is scoped to this one file):
  // The authoritative AC3 gate is scripts/check-design-tokens.mjs, which runs
  // as a prebuild and covers all 72 source files. This test is a fast local
  // guard on the single file s04 edits — it runs in the unit-test suite and
  // catches a token mistake before the full build. It does NOT replace the
  // prebuild guard; it complements it for s04's one edit target.
  it("contains no raw hex colour or colour-function values", () => {
    // Builds the pattern from parts to avoid the literal tokens being picked up
    // by scripts/check-design-tokens.mjs, which scans all *.ts files including
    // this test. The guard allowlist sentinel covers the two lines below.
    // design-tokens-allow: regex literals assembled as strings, not production CSS
    const rgbFn = "rgb("
    const hslFn = "hsl("
    const rawColourPattern = new RegExp(
      "#[0-9a-fA-F]{3,6}\\b|" +
        rgbFn.replace("(", "\\(") +
        "|" +
        hslFn.replace("(", "\\("),
    )
    expect(
      rawColourPattern.test(sidebarSource),
      "app-sidebar.tsx must not contain raw colours — use design tokens only",
    ).toBe(false)
  })
})

// ─── s10-defect-sweep F1: sidebar chrome hidden on print ──────────────────────
//
// AppSidebar is a persistent bg-pine <aside> with a text-paper Logo/nav — the
// same invisible-chrome-on-print bug as the landing/legal headers. The mobile
// drawer duplicates that chrome inside a portal.

describe("app-sidebar — s10-defect-sweep F1: chrome hidden on print", () => {
  it("desktop <aside> carries print-hide", () => {
    expect(
      sidebarSource,
      'app-sidebar.tsx AppSidebar <aside> must carry "print-hide" — its bg-pine background and text-paper Logo/nav print invisible otherwise',
    ).toMatch(/"light-scope hidden shrink-0 self-start bg-pine[^"]*print-hide/)
  })

  it("mobile drawer panel carries print-hide", () => {
    expect(
      mobileSidebarSource,
      'mobile-sidebar.tsx drawer panel must carry "print-hide" — same bg-pine chrome, portalled to <body>',
    ).toMatch(/overlay-drawer light-scope absolute[^"]*print-hide/)
  })
})
