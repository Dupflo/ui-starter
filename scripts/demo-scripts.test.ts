import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// T7 (s11-demo-mode) — dev:demo / start:demo npm scripts.
//
// Architecture note (human decision, 28/08/2026): DEMO_MODE is a BUILD-TIME
// constant (next.config.ts `env` block), not a runtime flag — see
// docs/plans/s11-demo-mode.md "Architecture decision". `start:demo` therefore
// needs its OWN build (a normal `npm run build` bakes DEMO_MODE=undefined,
// which would make `next start` serve a non-demo artifact): it runs
// `next build` with DEMO_MODE=1 set, then `next start`. That rebuild is the
// accepted cost of making the flag a compile-time constant: demo cannot be
// switched on at runtime on an artifact built without it.

const root = fileURLToPath(new URL("../", import.meta.url))
const pkg = JSON.parse(readFileSync(`${root}package.json`, "utf8")) as {
  scripts: Record<string, string>
}

describe("package.json — dev:demo / start:demo scripts", () => {
  it("dev:demo sets DEMO_MODE=1 and runs next dev", () => {
    expect(pkg.scripts["dev:demo"]).toMatch(/DEMO_MODE=1/)
    expect(pkg.scripts["dev:demo"]).toMatch(/next dev/)
  })

  it("start:demo builds its OWN artifact with DEMO_MODE=1, then serves it", () => {
    expect(pkg.scripts["start:demo"]).toMatch(/DEMO_MODE=1[^&]*next build/)
    expect(pkg.scripts["start:demo"]).toMatch(/next start/)
  })
})

describe("hosting/config surfaces never mention DEMO_MODE by hand", () => {
  it("vercel.json does not reference DEMO_MODE", () => {
    const vercelPath = `${root}vercel.json`
    if (!existsSync(vercelPath)) return
    expect(readFileSync(vercelPath, "utf8")).not.toMatch(/DEMO_MODE/)
  })

  it(".env.local.example does not reference DEMO_MODE (not a hand-set hosting var)", () => {
    const envExamplePath = `${root}.env.local.example`
    if (!existsSync(envExamplePath)) return
    expect(readFileSync(envExamplePath, "utf8")).not.toMatch(/DEMO_MODE/)
  })
})

describe("README documents demo mode", () => {
  it("README.md exists and documents dev:demo / start:demo", () => {
    const readmePath = `${root}README.md`
    expect(existsSync(readmePath), "README.md must exist").toBe(true)
    const readme = readFileSync(readmePath, "utf8")
    expect(readme).toMatch(/dev:demo/)
    expect(readme).toMatch(/start:demo/)
    expect(readme).toMatch(/DEMO_MODE/)
  })
})
