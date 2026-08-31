import { readFileSync } from "node:fs"
import { execSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { describe, it, expect, afterEach } from "vitest"

// Follow-up to s12-ui-gallery: the /ui route and the sidebar link that
// exposes it must share one visibility predicate, or the two can silently
// drift — a link that 404s, or a reachable page nobody can find. This file
// pins that BOTH call sites use `isGalleryVisible()` imported from
// lib/demo/flag.ts (the single implementation), and that no other tracked
// file re-implements the OR-composition itself.

const repoRoot = fileURLToPath(new URL("../../", import.meta.url))

// Strips comments before matching so a doc comment that merely *mentions*
// `isGalleryVisible()` cannot satisfy the "is it actually called" assertions
// below — probed: without this, hardcoding the sidebar's gate to a literal
// `true` still left the surrounding doc comment's `isGalleryVisible()`
// mention in place and the test stayed green. Good enough for the two
// hand-written files here (not a general-purpose JS parser).
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
}

const pageSource = readFileSync(
  path.join(repoRoot, "app/[locale]/ui/page.tsx"),
  "utf8",
)
const sidebarSource = readFileSync(
  path.join(repoRoot, "components/app/app-sidebar.tsx"),
  "utf8",
)
const pageCode = stripComments(pageSource)
const sidebarCode = stripComments(sidebarSource)

const env = process.env as Record<string, string | undefined>

describe("isGalleryVisible — build-time predicate, truth table", () => {
  afterEach(() => {
    delete env.DEMO_MODE
  })

  it("is ON when isDemoMode() is true, regardless of NODE_ENV", async () => {
    const { isGalleryVisible } = await import("./flag")
    env.DEMO_MODE = "1"
    expect(isGalleryVisible()).toBe(true)
  })

  it("is ON when NODE_ENV is development, regardless of DEMO_MODE", async () => {
    const { isGalleryVisible } = await import("./flag")
    delete env.DEMO_MODE
    const original = env.NODE_ENV
    env.NODE_ENV = "development"
    try {
      expect(isGalleryVisible()).toBe(true)
    } finally {
      env.NODE_ENV = original
    }
  })

  it("is OFF when neither holds", async () => {
    const { isGalleryVisible } = await import("./flag")
    delete env.DEMO_MODE
    const original = env.NODE_ENV
    env.NODE_ENV = "production"
    try {
      expect(isGalleryVisible()).toBe(false)
    } finally {
      env.NODE_ENV = original
    }
  })
})

describe("gallery link/route parity — one predicate, two call sites", () => {
  it("the route gates /ui by calling isGalleryVisible(), imported from lib/demo/flag", () => {
    expect(pageSource).toMatch(
      /import\s*\{[^}]*\bisGalleryVisible\b[^}]*\}\s*from\s*["']@\/lib\/demo\/flag["']/,
    )
    // Real usage, not just a mention in a doc comment.
    expect(pageCode).toMatch(/isGalleryVisible\(\)/)
  })

  it("the sidebar gates the gallery nav item by calling isGalleryVisible(), imported from lib/demo/flag", () => {
    expect(sidebarSource).toMatch(
      /import\s*\{[^}]*\bisGalleryVisible\b[^}]*\}\s*from\s*["']@\/lib\/demo\/flag["']/,
    )
    // Real usage, not just a mention in a doc comment — this is the
    // assertion that must go red if the gate is ever hardcoded.
    expect(sidebarCode).toMatch(/isGalleryVisible\(\)/)
  })

  it("no tracked file re-implements the OR-composition outside lib/demo/flag.ts (single implementation guard)", () => {
    // The predicate is `isDemoMode() || process.env.NODE_ENV === "development"`
    // (any whitespace). If this shows up anywhere but flag.ts, the route and
    // the sidebar (or a future third caller) can drift back to their own copy.
    const output = execSync(
      String.raw`git grep -nE "isDemoMode\(\)\s*\|\|\s*process\.env\.NODE_ENV" -- '*.ts' '*.tsx' || true`,
      { cwd: repoRoot, encoding: "utf8" },
    )
    const offenders = output
      .split("\n")
      .filter(Boolean)
      .map((line) => line.split(":")[0])
      .filter((file) => file !== "lib/demo/flag.ts")

    expect(
      offenders,
      `only lib/demo/flag.ts may implement the gallery-visibility predicate; found: ${offenders.join(", ")}`,
    ).toEqual([])
  })
})
