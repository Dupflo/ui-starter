import { execSync } from "node:child_process"
import { existsSync, readFileSync, rmSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// T8 regression (s11-demo-mode) — next.config.ts's `env.DEMO_MODE` MUST
// coalesce to `""` (never bare `process.env.DEMO_MODE`, which is `undefined`
// when the var is unset).
//
// The bug this pins: Next's `env` config only INLINES a key at build time
// when its value is a defined string. Passing `undefined` (the bare
// passthrough form) makes Next silently DROP the key from
// `required-server-files.json`'s `config.env` map instead of inlining
// `undefined` — `lib/demo/flag.ts`'s `process.env.DEMO_MODE` then compiles
// down to a GENUINE RUNTIME lookup in the built artifact, not a constant.
//
// Measured impact (28/08/2026, closed same day by the `?? ""` fix below):
// an artifact built with `DEMO_MODE` unset, then started (`next start`)
// with `DEMO_MODE=1` set only on the START process (no rebuild), served the
// demo fixture on /fr/dashboard with no auth. With the fix, the same
// artifact + the same start-time env var redirects to /login instead —
// verified manually (see the implementer's report), not re-verified here
// (an HTTP round-trip is out of scope for this file; this file pins the
// COMPILER property that makes that verification meaningful).
//
// This test runs a REAL `next build` — the property it pins is a compiler
// behaviour (env inlining), not something importing next.config.ts's
// exported object under vitest could observe.

const root = fileURLToPath(new URL("./", import.meta.url))
const manifestPath = `${root}.next/required-server-files.json`

describe("next.config.ts — DEMO_MODE is always inlined, even when unset (T8 regression)", () => {
  it("config.env.DEMO_MODE is a DEFINED string in the built artifact when DEMO_MODE is unset at build time", () => {
    rmSync(`${root}.next`, { recursive: true, force: true })

    const buildEnv = { ...process.env }
    delete buildEnv.DEMO_MODE

    execSync("npx next build", {
      cwd: root,
      env: buildEnv,
      stdio: "pipe",
    })

    expect(
      existsSync(manifestPath),
      "required-server-files.json must exist after build",
    ).toBe(true)
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      config: { env: Record<string, unknown> }
    }

    // A MISSING key means Next dropped it and never inlined it — the
    // exact bug: process.env.DEMO_MODE stays a live runtime lookup in the
    // compiled artifact. An empty string IS defined and passes.
    expect(
      manifest.config.env,
      `next.config.ts's env.DEMO_MODE must coalesce (?? "") so Next always inlines it, even unset`,
    ).toHaveProperty("DEMO_MODE")
    expect(typeof manifest.config.env.DEMO_MODE).toBe("string")
  }, 120_000)
})
