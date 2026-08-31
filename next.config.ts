import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin()

const nextConfig: NextConfig = {
  // s11-demo-mode — inlines DEMO_MODE at build time (human decision,
  // 28/08/2026: build-time constant, not a runtime flag — see
  // docs/plans/s11-demo-mode.md "Architecture decision" and
  // lib/demo/flag.ts for the full, corrected write-up of what this
  // actually buys). Next's compiler statically replaces every literal
  // `process.env.DEMO_MODE` reference with this value at build time, so
  // `lib/demo/flag.ts`'s isDemoMode() becomes a real compile-time constant
  // — but ONLY if the value passed here is a defined string.
  //
  // The `?? ""` is load-bearing, not cosmetic: passing the bare
  // `process.env.DEMO_MODE` (which is `undefined` when the var is unset)
  // makes Next silently DROP the key instead of inlining it, so
  // `process.env.DEMO_MODE` in flag.ts stays a LIVE RUNTIME lookup in the
  // built artifact. Measured impact of that bug (closed 28/08/2026): a
  // production artifact built WITHOUT `DEMO_MODE`, started with
  // `DEMO_MODE=1` set only on the `next start` process (no rebuild), served
  // demo content on a protected route with no auth. `?? ""` forces Next to
  // always inline a defined value, so the check is provably `false` on any
  // artifact not built with `DEMO_MODE=1`.
  //
  // Regression-tested against the REAL compiler in
  // next.config.demo-flag.test.ts (asserts on the built
  // `.next/required-server-files.json`, not just this source file) — do
  // not revert to the bare passthrough form without re-reading that test.
  env: {
    DEMO_MODE: process.env.DEMO_MODE ?? "",
  },
  // Allow the dev server to be reached through an ngrok tunnel.
  // NB : les domaines ngrok gratuits récents sont en `.ngrok-free.dev`
  // (et non plus seulement `.ngrok-free.app`) — sans ça, Next bloque le JS
  // client cross-origin en dev et les formulaires partent en submit natif
  // (champs vidés, identifiants en query string).
  allowedDevOrigins: [
    "*.ngrok-free.dev",
    "*.ngrok-free.app",
    "*.ngrok.app",
    "*.ngrok.io",
  ],
}

export default withNextIntl(nextConfig)
