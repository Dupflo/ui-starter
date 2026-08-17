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
