import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { describe, it, expect } from "vitest"

// Source-level structural assertions (established convention — see
// components/app/app-sidebar.test.ts: environment: node, no jsdom).

const src = readFileSync(
  path.join(
    fileURLToPath(new URL(".", import.meta.url)),
    "demo-banner-controls.tsx",
  ),
  "utf8",
)

describe("demo-banner-controls.tsx — s11-demo-mode T6", () => {
  it('is a client component ("use client")', () => {
    expect(src).toContain('"use client"')
  })

  it("composes existing UI primitives only (Button, Select, TextField)", () => {
    expect(src).toMatch(/from ["']@\/components\/ui\/button["']/)
    expect(src).toMatch(/from ["']@\/components\/ui\/select["']/)
    expect(src).toMatch(/from ["']@\/components\/ui\/text-field["']/)
  })

  it("calls the four demo server actions", () => {
    expect(src).toContain("demoLoginAction")
    expect(src).toContain("demoSetRoleAction")
    expect(src).toContain("demoSetSubscriptionAction")
    expect(src).toContain("demoResetAction")
  })

  it("renders a reset control (labels.reset) regardless of login state", () => {
    expect(src).toMatch(/labels\.reset/)
  })

  it("reuses the shared useLogout hook for the logout control (no bespoke demo logout)", () => {
    expect(src).toMatch(/from ["']@\/lib\/hooks\/use-logout["']/)
  })

  it("carries no raw colour value (hex/rgb) — tokens only", () => {
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(src).not.toMatch(/rgba?\(/)
  })
})
