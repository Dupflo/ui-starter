import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { describe, it, expect, vi, beforeEach } from "vitest"

// Source-level structural assertions (see app-sidebar.test.ts / auth-shell.test.ts
// for the established convention — environment: node, no jsdom).

const src = readFileSync(
  path.join(fileURLToPath(new URL(".", import.meta.url)), "demo-banner.tsx"),
  "utf8",
)

describe("demo-banner.tsx — s11-demo-mode T6 (structure)", () => {
  it('stays a server component (no "use client")', () => {
    expect(src).not.toContain('"use client"')
  })

  it("checks isDemoMode() and short-circuits when off", () => {
    expect(src).toMatch(/from ["']@\/lib\/demo\/flag["']/)
    expect(src).toContain("isDemoMode()")
  })

  it("renders DemoBannerControls (the only demo-aware components: banner + controls, per T6)", () => {
    expect(src).toMatch(
      /from ["']\.\/demo-banner-controls["']|from ["']@\/components\/demo\/demo-banner-controls["']/,
    )
  })

  it("reads its copy from i18n (demo namespace), no hardcoded UI string", () => {
    expect(src).toMatch(/getTranslations\(\s*["']demo["']\s*\)/)
  })

  it("carries no raw colour value (hex/rgb) — tokens only", () => {
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(src).not.toMatch(/rgba?\(/)
  })
})

// ─── behaviour: isDemoMode() gate ──────────────────────────────────────────────

const isDemoModeMock = vi.fn()
vi.mock("@/lib/demo/flag", () => ({ isDemoMode: () => isDemoModeMock() }))

const getDemoUserMock = vi.fn()
const getDemoRoleMock = vi.fn()
const getDemoSubscriptionStatusMock = vi.fn()
vi.mock("@/lib/demo/state", () => ({
  getDemoUser: () => getDemoUserMock(),
  getDemoRole: () => getDemoRoleMock(),
  getDemoSubscriptionStatus: () => getDemoSubscriptionStatusMock(),
}))

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}))

// DemoBannerControls transitively imports Button -> @/i18n/navigation, which
// isn't resolvable under vitest's Node environment (no Next runtime) — mocked
// out here so this file can assert DemoBanner's OWN behaviour (the
// isDemoMode() gate) in isolation. Real coverage of the controls: their own
// demo-banner-controls.test.ts.
vi.mock("./demo-banner-controls", () => ({
  DemoBannerControls: () => null,
}))

import { DemoBanner } from "./demo-banner"

describe("DemoBanner — behaviour", () => {
  beforeEach(() => {
    isDemoModeMock.mockReset()
    getDemoUserMock.mockReset()
    getDemoRoleMock.mockReset()
    getDemoSubscriptionStatusMock.mockReset()
  })

  it("renders nothing when demo mode is off", async () => {
    isDemoModeMock.mockReturnValue(false)
    const el = await DemoBanner()
    expect(el).toBeNull()
  })

  it("renders when demo mode is on", async () => {
    isDemoModeMock.mockReturnValue(true)
    getDemoUserMock.mockReturnValue({ email: "demo@example.com" })
    getDemoRoleMock.mockReturnValue("admin")
    getDemoSubscriptionStatusMock.mockReturnValue("active")
    const el = await DemoBanner()
    expect(el).not.toBeNull()
  })
})
