import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// T2 (s10-defect-sweep) — the service-role client bypasses RLS (ADR 004 names it
// explicitly in its watch list) but was the only sensitive module in lib/ without
// the `server-only` guard. This pins the import source-level: vitest aliases
// `server-only` to a no-op stub (vitest.config.ts), so importing the module here
// can never prove the guard fires — the real proof is a build-time probe (see
// docs/research/s10-defect-sweep.md), run manually during implementation.

const sourcePath = fileURLToPath(new URL("./service-role.ts", import.meta.url))
const source = readFileSync(sourcePath, "utf8")

describe("lib/supabase/service-role.ts — server-only guard (s10-defect-sweep T2)", () => {
  it('imports "server-only" as its first statement', () => {
    expect(
      source.trimStart().startsWith('import "server-only"'),
      "the RLS-bypassing client must import server-only so it can never be pulled into a Client Component bundle",
    ).toBe(true)
  })
})
