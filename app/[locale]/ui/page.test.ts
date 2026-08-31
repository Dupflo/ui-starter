import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// T6 (s12-ui-gallery) — `/ui` renders in dev and demo, 404s on a normal
// production build. Proven for real with `npm run build` + `next start` +
// `curl /fr/ui` (404) then a `DEMO_MODE=1` build (200) — see the story
// report. This test pins the SOURCE shape that makes that true: the gate
// calls `isGalleryVisible()`, imported from lib/demo/flag.ts (the single
// implementation of the predicate — pulled out of this file in a follow-up
// to s12-ui-gallery so the sidebar nav link can call the exact same
// function; see lib/demo/gallery-visibility.test.ts for the parity guard),
// and the route calls `notFound()` when it is false — matching the admin
// page's own notFound() pattern (app/[locale]/(app)/admin/page.tsx).

const source = readFileSync(
  fileURLToPath(new URL("./page.tsx", import.meta.url)),
  "utf8",
)

describe("app/[locale]/ui/page.tsx — dev/demo-only route gate (s12-ui-gallery T6)", () => {
  it("imports isGalleryVisible from lib/demo/flag (the single predicate implementation)", () => {
    expect(source).toMatch(
      /import\s*\{\s*isGalleryVisible\s*\}\s*from\s*["']@\/lib\/demo\/flag["']/,
    )
  })

  it("calls isGalleryVisible() to decide the gate", () => {
    expect(source).toContain("isGalleryVisible()")
  })

  it("calls notFound() when the gallery is not visible", () => {
    expect(source).toContain("notFound()")
  })

  it("imports notFound from next/navigation", () => {
    expect(source).toMatch(
      /import\s*\{\s*notFound\s*\}\s*from\s*["']next\/navigation["']/,
    )
  })
})
