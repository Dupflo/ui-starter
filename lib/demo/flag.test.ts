import { execSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { describe, it, expect, afterEach } from "vitest"

// T1 (s11-demo-mode) — guardrail for the demo BUILD-TIME constant (human
// decision, 28/08/2026 — supersedes the earlier runtime-flag choice, see
// docs/plans/s11-demo-mode.md "Architecture decision").
//
// `DEMO_MODE` is inlined by Next at build time (next.config.ts `env` block):
// a normal `next build` run without `DEMO_MODE=1` bakes `isDemoMode()` down
// to a function that always returns `false`, making the demo code it guards
// provably unreachable. Measured caveat: the demo modules and fixtures DO
// still ship in the bundle (Turbopack does not eliminate them across the
// module boundary) — dead weight, not a reachable path. This file is still
// the load-bearing test of the story: `flag.ts` is the one place deciding
// whether a build is a demo build.

const repoRoot = fileURLToPath(new URL("../../", import.meta.url))
const thisFile = path.relative(
  repoRoot,
  fileURLToPath(new URL("./flag.ts", import.meta.url)),
)
// next.config.ts legitimately references process.env.DEMO_MODE too — that is
// the build-time inlining declaration itself, not a second "reader" deciding
// behaviour on the var's value.
const nextConfigFile = "next.config.ts"
// These two test files reference the literal in comments and assertions, not
// as a decision point. Allowlisted deliberately: the pattern below has no way
// to tell a reference from a read, so the list is the discriminator.
const allowedTestFiles = [
  "lib/demo/flag.test.ts",
  "next.config.demo-flag.test.ts",
]

// @types/node marks some env keys read-only; a plain cast keeps assignment simple.
const env = process.env as Record<string, string | undefined>

describe("lib/demo/flag.ts — single reader guard", () => {
  it("is the only tracked source file (besides next.config.ts's inlining declaration) reading process.env.DEMO_MODE", () => {
    // git grep respects .gitignore (no node_modules/.next noise) and only
    // scans tracked files — exactly the surface a reviewer would diff.
    const output = execSync(
      // NB: git's ERE has no \b. An earlier version of this test used one, so
      // the command matched NOTHING — not even flag.ts — and the assertion was
      // vacuous: a decoy reader was added and the suite stayed green (found in
      // review). The trailing class below is the portable equivalent, and the
      // pathspec covers *.mjs/*.js so scripts/ is guarded too.
      String.raw`git grep -nE "process\.env\.DEMO_MODE([^A-Z_0-9]|$)" -- '*.ts' '*.tsx' '*.mjs' '*.js' || true`,
      { cwd: repoRoot, encoding: "utf8" },
    )
    const offenders = output
      .split("\n")
      .filter(Boolean)
      .map((line) => line.split(":")[0])
      .filter(
        (file) =>
          file !== thisFile &&
          file !== nextConfigFile &&
          !allowedTestFiles.includes(file),
      )

    expect(
      offenders,
      `only ${thisFile} and ${nextConfigFile} may reference process.env.DEMO_MODE; found reader(s): ${offenders.join(", ")}`,
    ).toEqual([])
  })
})

describe("isDemoMode — build-time constant, fail-closed truth table", () => {
  afterEach(() => {
    delete env.DEMO_MODE
  })

  it("is OFF when DEMO_MODE is unset", async () => {
    const { isDemoMode } = await import("./flag")
    delete env.DEMO_MODE
    expect(isDemoMode()).toBe(false)
  })

  it("is ON when DEMO_MODE is exactly '1'", async () => {
    const { isDemoMode } = await import("./flag")
    env.DEMO_MODE = "1"
    expect(isDemoMode()).toBe(true)
  })

  it("is OFF for any value other than exactly '1' (malformed)", async () => {
    const { isDemoMode } = await import("./flag")
    for (const bad of ["true", "yes", "0", "TRUE", " 1", "1 "]) {
      env.DEMO_MODE = bad
      expect(isDemoMode(), `DEMO_MODE=${JSON.stringify(bad)}`).toBe(false)
    }
  })

  it("fail-closed: a throw while resolving the flag resolves to OFF", async () => {
    const { isDemoMode } = await import("./flag")
    const original = process.env
    // Simulates a broken/throwing environment accessor.
    process.env = new Proxy(original, {
      get(target, prop) {
        if (prop === "DEMO_MODE") throw new Error("boom")
        return Reflect.get(target, prop)
      },
    })
    try {
      expect(isDemoMode()).toBe(false)
    } finally {
      process.env = original
    }
  })
})
