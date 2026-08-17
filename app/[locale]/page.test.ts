import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { describe, it, expect } from "vitest"

// Source-level structural assertions for the landing page (s07-landing).
//
// WHY source-level (not DOM render):
// The repo runs vitest with `environment: node` (no jsdom, no testing-library).
// Adding a DOM runner would require a new npm dependency, which the s07
// interdicts explicitly forbid. The established convention is source inspection
// (see components/brand/logo.test.ts and components/app/app-sidebar.test.ts).
//
// AC1: hero + pricing (shared PLANS) + CTA.
// AC2: hero/closing CTAs → /signup; pricing CTA = SubscribeButton (unchanged).
// AC3: tokens-only (fast local guard; authoritative gate = check-design-tokens prebuild).
// AC4 (fr/en parity): covered automatically by messages/messages.test.ts.

const localeDir = fileURLToPath(new URL(".", import.meta.url))

const landingSource = readFileSync(path.join(localeDir, "page.tsx"), "utf8")

const pricingPageSource = readFileSync(
  path.join(localeDir, "pricing", "page.tsx"),
  "utf8",
)

// ─── AC1: shared PLANS + PlanCard (anti-divergence) ──────────────────────────

describe("landing page — AC1: shared PLANS + PlanCard anti-divergence", () => {
  it("imports PLANS from @/lib/stripe/config", () => {
    expect(
      landingSource,
      'landing page.tsx must import PLANS from "@/lib/stripe/config" — AC1 requires the same plan source as the pricing page',
    ).toMatch(
      /import\s*\{[^}]*\bPLANS\b[^}]*\}\s*from\s*["']@\/lib\/stripe\/config["']/,
    )
  })

  it("references PlanCard component", () => {
    expect(
      landingSource,
      "landing page.tsx must reference PlanCard — AC1 requires the shared card component",
    ).toContain("PlanCard")
  })

  it("calls PLANS.map to render all plans", () => {
    expect(
      landingSource,
      "landing page.tsx must call PLANS.map() to render all plans from the shared source",
    ).toContain("PLANS.map")
  })
})

// ─── Anti-divergence: both surfaces use PlanCard ─────────────────────────────

describe("pricing page — anti-divergence: uses shared PlanCard", () => {
  it("pricing/page.tsx references PlanCard (same component as landing)", () => {
    expect(
      pricingPageSource,
      "pricing/page.tsx must reference PlanCard — both surfaces must render via the shared component to prevent divergence",
    ).toContain("PlanCard")
  })
})

// ─── AC2: hero + closing CTAs → /signup ──────────────────────────────────────

describe("landing page — AC2: CTA routing", () => {
  it('contains href="/signup" for hero/closing CTAs', () => {
    expect(
      landingSource,
      'landing page.tsx must contain href="/signup" — hero and closing CTAs must route to signup',
    ).toContain('href="/signup"')
  })
})

// ─── AC3: tokens-only (no raw colour) ────────────────────────────────────────

describe("landing page — AC3: tokens-only (no raw colour)", () => {
  // Builds the pattern from parts to avoid the literal tokens being picked up
  // by scripts/check-design-tokens.mjs, which scans all *.ts files including
  // this test. The guard allowlist sentinel covers the two lines below.
  // design-tokens-allow: regex literals assembled as strings, not production CSS
  it("contains no raw hex colour or colour-function values", () => {
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
      rawColourPattern.test(landingSource),
      "landing page.tsx must not contain raw colours — use design tokens only (AC3)",
    ).toBe(false)
  })
})
