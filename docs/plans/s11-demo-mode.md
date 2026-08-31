---
validated: yes
---

# Plan — Story s11-demo-mode

Branch: `feature/s11-demo-mode`
Research: `docs/research/s11-demo-mode.md` — read it first; this plan does not repeat the seam map.

## Target story

Lancer le starter entier sans Supabase ni Stripe, avec des données fictives et des parcours
cliquables. Complexité réelle : **4**. La difficulté n'est pas la démo, c'est la garantie qu'elle
ne fuit pas en production.

## Architecture decision — build-time constant, demo provably unreachable

**Human decision (28/08/2026, reversing the earlier same-day runtime-flag decision below)**:
`DEMO_MODE` is a BUILD-TIME constant, inlined by Next (`next.config.ts`'s `env` block makes
every literal `process.env.DEMO_MODE` reference get statically replaced at build time), not a
value read at runtime. A normal `npm run build` (no `DEMO_MODE=1`) bakes `isDemoMode()`
(`lib/demo/flag.ts`, the only module allowed to reference the variable) down to a function that
always returns `false` — the demo-only code it guards is provably UNREACHABLE on that artifact.
`start:demo` therefore builds its OWN artifact (`DEMO_MODE=1 next build && next start`); serving
demo from a normal `npm run build` output does not work, because that build never had the
variable set.

**Corrected claim (28/08/2026, see T8 below for the full measurement)**: the original wording of
this decision said the demo code becomes "DEAD code, absent from the shipped artifact" and framed
the goal as "protection by absence". That is NOT what was measured, and this file must not repeat
it. What is true: `isDemoMode()` is a real compile-time constant (`false` on any artifact built
without `DEMO_MODE=1`), so the demo code it guards can never execute — that part is a genuine,
regression-tested security property (`next.config.demo-flag.test.ts`). What is also true:
`lib/demo/fixtures.ts` and `lib/demo/state.ts` are NOT eliminated from the bundle — they still
ship inside `.next/server/chunks/` (3 files, measured). Turbopack does not perform dead-code
elimination across the `if (isDemoMode())` module boundary. So: protection by a
provably-constant condition, not protection by absence. The rejection rationale for the
runtime-flag design below stands on its stronger part (removing the "could, in principle, be
misconfigured" class of risk — a build-time constant a hosting dashboard cannot flip at runtime,
once `next.config.ts` inlines it correctly) but not on the "demo code is absent" part, which
was aspirational, not delivered.

**Guardrail contract** (`lib/demo/flag.ts`, the only module allowed to reference the variable,
alongside `next.config.ts`'s inlining declaration itself):

1. Demo is ON only when `DEMO_MODE` is exactly `"1"`. Any other value, including unset or
   malformed, is OFF.
2. Fail-closed on anything unexpected: a malformed value or a throw while resolving the flag
   resolves to OFF. Demo mode never activates by accident or by error.
3. When demo IS active, the banner (T6) is non-negotiable and unconditional — an active demo must
   always be visibly a demo, so a misconfiguration is obvious on sight rather than silent.

<details>
<summary>Superseded — original runtime-flag decision (28/08/2026, reversed same day)</summary>

The flag was read at RUNTIME, not inlined at build time. One build served both modes;
`start:demo` was the same artifact plus environment. Accepted trade-off at the time: the demo
code and fixtures shipped inside the production artifact, and the protection was a condition
rather than an absence — a two-variable guardrail (`DEMO_MODE=1` plus a second,
production-only opt-in `DEMO_MODE_ALLOW_PRODUCTION=1`) carried the entire burden. Superseded by
the build-time constant above before ship; kept here only so the reasoning isn't rediscovered
from scratch.

</details>

## Tasks

- [x] **T1 — the flag module.** `lib/demo/flag.ts` implements the guardrail contract above and is
      the ONLY module allowed to reference `DEMO_MODE` (besides `next.config.ts`'s inlining
      declaration). A guard test greps the tree and fails on a second reader (same shape as s10's
      `public/` guard).
      _Vérification_: guard test written failing first (add a decoy reader, watch it go red). Then a
      truth-table test — unset, `DEMO_MODE=1`, malformed values, and a throw during resolution.
      **Revised (28/08/2026, architecture pivot to build-time constant)**: the original version of
      this task covered a 5-point runtime guardrail (production/second-opt-in case included); that
      contract was superseded same-day by the build-time constant above — see the collapsed
      "superseded" note. `flag.ts` and its test were rewritten accordingly; the production-mode case
      no longer exists to test.

- [x] **T2 — fixtures.** `lib/demo/fixtures.ts`: a demo user satisfying Supabase's `User` type in
      full (`email`, `user_metadata` are read by the app), a profile, a subscription, dashboard data —
      all typed with `Database`, so the compiler checks them against the real schema.
      _Vérification_: `typecheck` proves the shapes; a test asserts the fixture user satisfies the
      fields the 4 calling pages actually read.

- [x] **T3 — in-memory session state.** `lib/demo/state.ts`: current user, role (`user`/`admin`),
      subscription status. Mutable, module-scoped, reset on restart (assumed by the story). Document
      that it is per-process and not to be relied on under multiple workers.
      **Revised (fix run, post-review) — moved to a session cookie.** The module-scoped `let state`
      design above does not survive `proxy.ts` (middleware) and the server actions/RSC tree compiling
      into SEPARATE module graphs: mutating the module from a server action (sign out, switch role…)
      was invisible to the middleware, which kept enforcing a stale state — reproduced end-to-end by
      the review (critical, the A–E sequence) and root-caused to this task dropping the "+ cookie de
      session démo" half that both the story and the research called for. Fixed by moving the session
      into `lib/demo/session-cookie.ts` (a pure, unsigned JSON codec — nothing worth protecting from
      tampering, it carries no real identity) read/written by `lib/demo/state.ts` via `next/headers`'s
      `cookies()` on the action/RSC side and directly off `request.cookies` in `proxy.ts`, since both
      compile separately but both read the SAME HTTP request. Direct consequence, also human-decided
      post-review: the state now survives a server restart (a cookie, not a process), which the
      story's original AC did not anticipate — see `docs/stories.md` s11 for the corrected wording.
      The human decision was not to force a reset-on-restart but to add an explicit reset control
      instead (`demoResetAction`, `lib/actions/demo-controls.ts`): it deletes the cookie so the next
      read falls back to `parseDemoSession`'s default, byte-identical to a first visit.

- [x] **T4 — swap the 13 seams.** In `lib/supabase/server.ts` (`getUser`), `lib/data/{identity,
dashboard,subscription,ensure-profile}.ts`, `lib/actions/{checkout,settings,sign-out,
password-reset}.ts`: delegate to the demo implementation when the flag is on. The condition
      lives in the module that owns the operation — **never in a component**.
      `isAdmin`, `initialsOf`, `isActiveSubscriber` and `PLANS` are pure and need no treatment.
      _Vérification_: a test per swapped module asserting both branches.

- [x] **T5 — `proxy.ts`.** Return the demo identity **before** entering the
      `createServerClient` → `getUser()` block; the AGENTS.md rule forbidding anything between them
      must remain literally true on the real path.
      _Vérification_: read the file and confirm the real path is untouched.

- [x] **T6 — demo UI.** A persistent banner (i18n fr+en, tokens only, no hardcoded string, no raw
      colour) and the controls the story requires: role switch `user`↔`admin`, simulated subscribe
      that flips the gate. Compose existing `components/ui/*` primitives; a need the design system
      does not cover is a **gap to report**, not to fill freestyle.

- [x] **T7 — npm scripts** `dev:demo` / `start:demo`, and README documentation.
      **Revised (28/08/2026)**: `start:demo` builds its OWN artifact (`DEMO_MODE=1 next build && next
start`) rather than reusing a plain `npm run build` output, per the build-time constant above.

- [x] **T8 — the negative guarantee (the criterion that protects production).** With the flag
      unset: the demo branches are unreachable and the real path behaves exactly as before.
      _Vérification_: run the full suite with the flag unset; confirm the app still fails the same way
      when Supabase env vars are missing.
      **Revised (28/08/2026, architecture pivot to build-time constant)**: under the build-time
      architecture, "fixtures absent from the build output" is no longer an assumption to write a test
      against — it is the load-bearing claim of the WHOLE story, and it must be MEASURED, not assumed.

  **MEASURED — the claim did NOT hold as first implemented, reported rather than patched
  around.** `npm run build` with `DEMO_MODE` unset, then `grep -rl "cus_demo" .next
--include="*.js"` → **3 files** in `.next/server/chunks/` (`node_modules_0gajohu._.js`,
  `[root-of-the-server]__16562rv._.js`, `ssr/[root-of-the-server]__1o5iv7x._.js`) still contained
  the demo fixtures. Worse: 2 of those 3 files still contained the LITERAL string
  `process.env.DEMO_MODE` — Next's `env` config only inlines the value when it is a defined
  string at build time; with the bare passthrough `env: { DEMO_MODE: process.env.DEMO_MODE }`,
  an unset var evaluates to `undefined`, which Next silently DROPPED from
  `required-server-files.json`'s `"env"` map (confirmed: `"env": {}`) instead of inlining
  `undefined` — so `isDemoMode()` compiled down to a genuine, live `process.env.DEMO_MODE`
  runtime read, not a constant. Confirmed end-to-end: built with `DEMO_MODE` unset, then ran
  `next start` with `DEMO_MODE=1` set only on the START process (no rebuild) — `/fr/dashboard`
  served the demo fixture ("Alex Démo", "demo@example.com") over HTTP 200, no auth. This was
  exactly the hosting-dashboard-misconfiguration scenario the original runtime guardrail
  (superseded above) was built to make inert.

  **RESOLVED (28/08/2026, same day).** One-line fix in `next.config.ts`:
  `DEMO_MODE: process.env.DEMO_MODE ?? ""` (coalesce to an empty string, never the bare
  passthrough) — forces Next to always inline a DEFINED value, so the check becomes a real
  compile-time constant regardless of whether `DEMO_MODE` was set at build time. Verified by
  rebuilding: `required-server-files.json`'s `config.env` → `{"DEMO_MODE":""}` (was `{}`); literal
  `process.env.DEMO_MODE` in server chunks → **0** (was 2); re-ran the same runtime attack
  (artifact built without the flag, `DEMO_MODE=1` set only on `next start`) → `/fr/dashboard`
  redirects to `/login`, zero demo-user strings in the response — the attack is defeated.
  Rebuilding WITH `DEMO_MODE=1` still inlines `"1"` and demo still works. Regression-tested
  against the real compiler in `next.config.demo-flag.test.ts` (written failing first against the
  bare-passthrough form, asserts on the built `.next/required-server-files.json`).

  **Residual, measured and accepted, not a security gap**: the fixture/state modules still ship
  inside `.next/server/chunks/` (same 3 files as above, unchanged by the fix) — Turbopack does not
  eliminate them across the `isDemoMode()` module boundary. `isDemoMode()` is provably `false` on
  an artifact built without `DEMO_MODE=1`, so this code can never execute; it is inert but
  present. Bundle-size/tidiness matter, not a security one — see `lib/demo/flag.ts`'s corrected
  docstring for the precise claim (behavioural protection complete; protection-by-absence is not,
  and this file no longer asserts that it is).

## Definition of Done

- 8 tasks ticked, each with its verification run.
- `npm run dev:demo` and `npm run start:demo` serve every screen with **no** Supabase/Stripe env var set.
- Gates green: `test` · `test:build` · `lint:design` · `typecheck` · `build` · `lint` (4 inherited
  warnings tolerated). `test:build` is listed explicitly (fix run, post-review): it is excluded from
  `npm run test` on purpose (T8 above — it runs a real `next build` and clears `.next`), and this repo
  has no CI to call it independently, so it belongs on the one checklist anyone actually runs.
- One commit on `feature/s11-demo-mode`.

## Files touched (prévision)

`lib/demo/*` (new) · `lib/supabase/server.ts` · `lib/data/*` · `lib/actions/*` · `proxy.ts` ·
`next.config.ts` · `package.json` · `components/demo/*` (new) · `messages/{fr,en}.json` ·
`README.md` · colocated tests.
