import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// T6 (s11-demo-mode) — the demo banner is mounted ONCE, in the root locale
// layout, so it is unconditionally present on every screen (public, auth,
// app, legal) when demo mode is active (guardrail contract point 5).

const source = readFileSync(
  fileURLToPath(new URL("./layout.tsx", import.meta.url)),
  "utf8",
)

describe("app/[locale]/layout.tsx — mounts the demo banner on every screen (s11-demo-mode T6)", () => {
  it("imports DemoBanner from components/demo", () => {
    expect(source).toMatch(
      /import\s*\{\s*DemoBanner\s*\}\s*from\s*["']@\/components\/demo\/demo-banner["']/,
    )
  })

  it("renders <DemoBanner /> in the JSX", () => {
    expect(source).toContain("<DemoBanner")
  })
})
