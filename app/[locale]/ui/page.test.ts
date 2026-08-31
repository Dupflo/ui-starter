import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// T6 (s12-ui-gallery) — `/ui` renders in dev and demo, 404s on a normal
// production build. Proven for real with `npm run build` + `next start` +
// `curl /fr/ui` (404) then a `DEMO_MODE=1` build (200) — see the story
// report. This test pins the SOURCE shape that makes that true: the gate
// reads `isDemoMode()` (the single reader of `DEMO_MODE`, guarded by
// lib/demo/flag.test.ts) OR `NODE_ENV === "development"`, and calls
// `notFound()` when neither holds — matching the admin page's own
// notFound() pattern (app/[locale]/(app)/admin/page.tsx).

const source = readFileSync(
  fileURLToPath(new URL("./page.tsx", import.meta.url)),
  "utf8",
)

describe("app/[locale]/ui/page.tsx — dev/demo-only route gate (s12-ui-gallery T6)", () => {
  it("imports isDemoMode from lib/demo/flag (the single DEMO_MODE reader)", () => {
    expect(source).toMatch(
      /import\s*\{\s*isDemoMode\s*\}\s*from\s*["']@\/lib\/demo\/flag["']/,
    )
  })

  // Whether page.tsx reads the DEMO_MODE env var directly (a second reader)
  // is already enforced globally by lib/demo/flag.test.ts, which git-greps
  // every tracked file for that literal reference — repeating the literal
  // here to assert its absence would itself trip that same guard once this
  // file is tracked. See that test for the actual enforcement.

  it('checks NODE_ENV === "development" alongside isDemoMode()', () => {
    expect(source).toContain('process.env.NODE_ENV === "development"')
  })

  it("calls notFound() when neither demo mode nor development", () => {
    expect(source).toContain("notFound()")
  })

  it("imports notFound from next/navigation", () => {
    expect(source).toMatch(
      /import\s*\{\s*notFound\s*\}\s*from\s*["']next\/navigation["']/,
    )
  })
})
