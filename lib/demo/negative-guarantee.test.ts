import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// T8 (s11-demo-mode) — the negative guarantee, the criterion that protects
// production. Unlike every other test in this story, this file does NOT mock
// lib/demo/flag.ts: it exercises the REAL guardrail wired to its REAL
// callers (lib/supabase/server.ts), so a regression in the WIRING (not just
// the unit logic already pinned by flag.test.ts) would be caught here too.
//
// `@supabase/ssr` and `next/headers` are mocked because vitest runs outside
// a Next request scope (`cookies()` would throw for an unrelated, harness-only
// reason otherwise) — `createServerClient` is mocked to reproduce its REAL,
// observed behaviour with missing env vars: it throws synchronously
// ("Your project's URL and Key are required…"), verified against the real
// @supabase/ssr package during implementation.
//
// Architecture note (human decision, 28/08/2026): DEMO_MODE is now a
// BUILD-TIME constant (next.config.ts `env` block), not a runtime flag —
// see docs/plans/s11-demo-mode.md "Architecture decision". There is no more
// NODE_ENV=production special case or second opt-in var: vitest can only
// prove the ON/OFF *decision* logic (isDemoMode()) end-to-end here — that a
// normal `next build` run without DEMO_MODE=1 makes that decision resolve to
// "off" is a compiler/bundler property, verified separately by an actual
// `next build` + grepping `.next/` for a fixture-only string (see the
// implementer's report; not expressible as a vitest unit test).

const SUPABASE_ENV_ERROR =
  "Your project's URL and Key are required to create a Supabase client!"

vi.mock("@supabase/ssr", () => ({
  createServerClient: (url: string | undefined, key: string | undefined) => {
    if (!url || !key) throw new Error(SUPABASE_ENV_ERROR)
    return { auth: { getUser: vi.fn() } }
  },
}))
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [],
    get: () => undefined,
    set: () => {},
  }),
}))

const env = process.env as Record<string, string | undefined>

function clearAllDemoAndSupabaseEnv() {
  delete env.DEMO_MODE
  delete env.NEXT_PUBLIC_SUPABASE_URL
  delete env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}

describe("T8 — flag unset: real path unchanged, real crash on missing Supabase env", () => {
  beforeEach(() => {
    clearAllDemoAndSupabaseEnv()
  })
  afterEach(() => {
    clearAllDemoAndSupabaseEnv()
  })

  it("getUser() still crashes exactly as before (no NEXT_PUBLIC_SUPABASE_* vars) — demo does not soften the real failure mode", async () => {
    const { getUser } = await import("@/lib/supabase/server")
    await expect(getUser()).rejects.toThrow(SUPABASE_ENV_ERROR)
  })
})

describe("T8 — DEMO_MODE=1 wired end-to-end (real flag.ts, real getUser())", () => {
  beforeEach(() => {
    clearAllDemoAndSupabaseEnv()
  })
  afterEach(() => {
    clearAllDemoAndSupabaseEnv()
  })

  it("DEMO_MODE=1: getUser() takes the demo path — resolves to the in-memory fixture, never touches Supabase", async () => {
    env.DEMO_MODE = "1"

    const { getUser } = await import("@/lib/supabase/server")

    // Demo path taken -> resolves to the in-memory demo fixture, never
    // touches Supabase (which would otherwise throw on missing env).
    await expect(getUser()).resolves.not.toBeNull()
  })
})
