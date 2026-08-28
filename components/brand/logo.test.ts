import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { describe, it, expect } from "vitest"

// Source-level inspection of the Logo component. We assert directly on the
// component source to catch hardcoded brand strings that would be rendered on
// every screen that imports Logo (legal header, pricing, app-sidebar, auth-shell).
// This mirrors the approach in messages/legal.test.ts.

const logoSource = readFileSync(
  path.join(fileURLToPath(new URL(".", import.meta.url)), "logo.tsx"),
  "utf8",
)

describe("Logo component — no killed-domain branding", () => {
  it('contains no "Applyzi" string (case-insensitive) anywhere in source', () => {
    expect(
      /applyzi/i.test(logoSource),
      'logo.tsx contains "Applyzi" — remove all references to the killed domain',
    ).toBe(false)
  })

  it('aria-label contains "UI Starter" (the neutral app name)', () => {
    expect(
      logoSource,
      'aria-label must reference "UI Starter", not the killed domain',
    ).toContain('aria-label="UI Starter"')
  })

  it('wordmark renders the neutral name "UI Starter"', () => {
    expect(logoSource, 'wordmark must contain "UI Starter"').toContain(
      "UI Starter",
    )
  })
})

// ─── s10-defect-sweep F2: light-register wordmark accent passes WCAG AA ───────
//
// wordmarkAccent used to be a tautological ternary (`text-lime` on both
// branches): the light register was never actually designed. The `lime`
// token on the `paper` background is 2.84:1 — fails AA (4.5:1). The `link`
// token on `paper` is 5.98:1 — passes.

describe("Logo component — s10-defect-sweep F2: light-register accent contrast", () => {
  it("wordmarkAccent ternary is not tautological (dark and light branches differ)", () => {
    expect(
      logoSource,
      "wordmarkAccent must not resolve to the same class in both branches of the variant ternary — the light register needs its own, contrast-checked token",
    ).not.toMatch(
      /wordmarkAccent = variant === "dark" \? (["'][\w-]+["']) : \1/,
    )
  })

  it("light register uses text-link (5.98:1 on paper) instead of text-lime (2.84:1, fails AA)", () => {
    expect(
      logoSource,
      'variant="light" wordmarkAccent must resolve to "text-link" — an existing token that passes WCAG AA (4.5:1) against text-paper, unlike text-lime',
    ).toMatch(/variant === "dark" \? "text-lime" : "text-link"/)
  })
})
