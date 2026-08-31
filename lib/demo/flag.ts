/**
 * Single reader of `DEMO_MODE` — guardrail (docs/plans/s11-demo-mode.md,
 * "Architecture decision").
 *
 * BUILD-TIME constant (human decision, 28/08/2026 — supersedes the earlier
 * runtime-flag choice). `next.config.ts`'s `env` block makes Next's compiler
 * statically replace every literal `process.env.DEMO_MODE` reference below
 * with the value present in the process running `next build`/`next dev`. A
 * normal production build (no `DEMO_MODE=1`) bakes in `""` (empty string —
 * `next.config.ts` coalesces `process.env.DEMO_MODE ?? ""`; see why below):
 * `isDemoMode()` becomes a function that always returns `false`.
 *
 * MEASURED, CORRECTED CLAIM (28/08/2026 — an earlier version of this
 * docstring was wrong; do not restate it): the demo code guarded behind
 * `isDemoMode()` is provably UNREACHABLE on an artifact built without
 * `DEMO_MODE=1` — the check is a real compile-time constant, confirmed by
 * grepping the built artifact for the literal string `process.env.DEMO_MODE`
 * (0 occurrences after the fix below, was 2). It is NOT, however, dead code
 * eliminated from the bundle: `lib/demo/fixtures.ts` and `lib/demo/state.ts`
 * still ship inside `.next/server/chunks/` (3 files, measured) — Turbopack
 * does not remove the module graph across the `if (isDemoMode())` boundary.
 * This is a bundle-size/tidiness matter, not a security one: the code is
 * inert, not merely conditional, but it is present. "Protection by absence"
 * was the goal; what was actually achieved and verified is "protection by a
 * provably-constant condition" — precise, not the same claim.
 *
 * WHY THE COALESCE MATTERS: Next's `env` config only INLINES a key when its
 * value is a defined string at build time. `next.config.ts` must write
 * `process.env.DEMO_MODE ?? ""`, never the bare passthrough — passing
 * `undefined` (what a bare `process.env.DEMO_MODE` evaluates to when unset)
 * makes Next silently DROP the key instead of inlining it, and
 * `process.env.DEMO_MODE` below then compiles down to a GENUINE RUNTIME
 * lookup in the built artifact. This was a real, closed vulnerability: an
 * artifact built without `DEMO_MODE`, then started with `DEMO_MODE=1` set
 * only on the `next start` process (no rebuild), served the demo fixture on
 * `/fr/dashboard` with no auth. Pinned by `next.config.demo-flag.test.ts`
 * (runs a real `next build`, asserts the manifest inlines a defined value).
 *
 * IMPORTANT: for the inlining to apply, `process.env.DEMO_MODE` must be
 * referenced LITERALLY below — no destructuring (`const { DEMO_MODE } =
 * process.env`), no aliasing through a variable. Either defeats Next's
 * static replacement and silently falls back to a runtime lookup.
 *
 * NO other module may read `process.env.DEMO_MODE` (next.config.ts's own
 * reference is the inlining declaration itself, not a second decision
 * point) — a guard test (flag.test.ts) greps the tracked tree and fails on
 * a second reader.
 *
 * Contract:
 * 1. ON only when the value is exactly `"1"`. Anything else — unset,
 *    malformed (`"true"`, `"0"`, padded…) — is OFF.
 * 2. Fail-closed: a throw while resolving the flag resolves to OFF.
 */
export function isDemoMode(): boolean {
  try {
    return process.env.DEMO_MODE === "1"
  } catch {
    return false
  }
}
