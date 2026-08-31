# Review — Story s11-demo-mode

> Fresh-context reviewer subagent. Diff judged: `git diff origin/main...feature/s11-demo-mode`
> (`74de1fd`, 2 commits, 45 files, +2245/−28). All gates re-run on a clean `.next`.
> This story adds a second execution path through the authentication boundary, so the review
> weighted "the demo is unreachable when it must be" far above "the demo works".

## Gates — run by the reviewer

| Gate                  | Result                                               |
| --------------------- | ---------------------------------------------------- |
| `npm run test`        | 44 files / **292 tests passed**                      |
| `npm run lint:design` | ✓ no arbitrary values in 112 files (12 allowlisted)  |
| `npm run typecheck`   | clean, exit 0                                        |
| `npm run build`       | success, all routes emitted                          |
| `npm run lint`        | 4 problems (0 errors, 4 warnings) — all pre-existing |

Both commit messages state true test counts (292/44 measured; the first commit's 291/43 is consistent).

## The core security property — verified, and it holds

The attack was reproduced end-to-end rather than read from the report:

- Fresh build with `DEMO_MODE` unset → `required-server-files.json` `config.env` = `{"DEMO_MODE":""}`.
- Literal `process.env.DEMO_MODE` remaining in `.next/**/*.js`: **0**.
- `isDemoMode()` compiles to a genuine constant: `try{return!1}catch{return!1}`.
- That artifact started with `DEMO_MODE=1` on the start process only → `/dashboard` returns
  `307 → /login?redirect=%2Fdashboard`, zero demo strings in the response.
- The three demo server actions, invoked directly using their real action IDs extracted from the
  built chunks, all return `not_demo` and change nothing.
- Client bundle: `grep -rl "cus_demo|demo@example.com" .next/static` → **0**. No fixture reaches
  the browser.
- Neutralization: reverting `next.config.ts` to the bare passthrough makes
  `next.config.demo-flag.test.ts` go red. That regression test bites.

**There is no path to the demo execution path on a production build.** The `?? ""` coalesce is
load-bearing and is now pinned by a test.

`proxy.ts`'s real path was word-diffed against `git show origin/main:proxy.ts`: the
`createServerClient` call, cookie handlers and `getUser()` are byte-identical apart from indentation
and a `user` → `realUser` rename. Nothing runs between the two calls. AGENTS.md's rule is intact.

All 13 seams verified individually: every demo branch is a leading early return, no real-branch line
changed. `ensureProfile` keeps `import "server-only"`. The pure helpers were left alone. No `if (demo)`
in a business component.

## Findings

### critical — the demo login journey is a dead end; `proxy.ts`'s demo identity is a frozen copy

`proxy.ts` imports `getDemoUser` from `lib/demo/state.ts`. **The middleware graph gets its own module
instance of that module** — the server actions mutate a different one. The middleware therefore never
observes a demo sign-in or sign-out.

Reproduced deterministically on `start:demo` (single `next-server` process, not a multi-worker
artifact) and identically on `dev:demo`:

```
A) fresh /dashboard              → 200
B) signOutAction (via /pricing)  → 200
C) /dashboard                    → 307  Location: /login      ← no "?redirect=" ⇒ the proxy let it
                                                                 through; the PAGE redirected.
                                                                 The middleware still sees a user.
D) POST demoLoginAction on /login→ 307  Location: /dashboard   ← proxy rule 3b fires on its stale
                                                                 "logged in" state, so the action
                                                                 NEVER RUNS
E) /dashboard                    → 307  Location: /login       ← still logged out. Loop.
```

The `?redirect=` discriminator is decisive: `proxy.ts` always appends it, the page-level
`redirect({href:"/login"})` never does.

Consequences:

1. The acceptance criterion _"connexion (n'importe quel email)"_ is **non-functional**. One click on
   "Se déconnecter" makes the demo unrecoverable without restarting the server. The same action
   posted to a non-intercepted route (`/pricing`) works — proving the action is fine and the
   middleware is the blocker.
2. `proxy.ts`'s demo branch is decorative: in demo mode it always reports the initial fixture user,
   so the middleware auth gate never reflects demo state.

**Root cause traces to something both the story and the research called for, which the plan dropped.**
`docs/stories.md` s11 says "état mutable en mémoire côté serveur **+ cookie de session démo**";
`docs/research/s11-demo-mode.md` says "cookies are the only place demo session state can live across
requests". Plan T3 kept only the module-scoped half.

**No test could have caught it**: `proxy.test.ts` mocks `@/lib/demo/state`, which collapses the two
module instances into one. The test "demo ON, demo user signed out → protected route redirects to
/login" is green against a runtime where it is false. Plan T5's verification ("read the file and
confirm the real path is untouched") verified the wrong half.

### major — the single-reader guard test never fails, proven with a decoy

`lib/demo/flag.test.ts:35` runs:

```
git grep -nE "process\.env\.DEMO_MODE\b" -- '*.ts' '*.tsx' || true
```

Git's ERE engine does not support `\b`. The command returns **nothing at all** — not even the two
files that certainly contain the string. `offenders` is always `[]` and the assertion is vacuous.

Proven: a decoy `decoy-reader.ts` containing `export const decoy = process.env.DEMO_MODE === "1"`,
`git add -N`'d, left the suite **5/5 green**. Plan T1's stated verification ("watch it go red") is
not true of the shipped test.

The invariant itself holds today — with a corrected grep the only production readers are
`lib/demo/flag.ts` and `next.config.ts`. It is the regression protection that is fake.
Two traps for the fix: dropping `\b` makes the test fail on `flag.test.ts` itself (it contains the
literal and is not allowlisted), and the pathspec omits `*.mjs`/`*.js`, leaving `scripts/` unguarded.

### major — the retracted "absent from the artifact" claim survives in three files

Commit `74de1fd` claims it "corrected every claim this story had made that was no longer true".
It did not:

- `README.md:43-45` — "le code démo qu'il protège devient du **code mort, absent de l'artefact
  livré**, pas simplement conditionnel dedans" — the primary user-facing document.
- `lib/demo/flag.test.ts:11-13` — same claim.
- `scripts/demo-scripts.test.ts:12` — "the accepted cost of 'protection by absence'".

Measured on a fresh non-demo build: `grep -rl "cus_demo" .next --include="*.js"` → **3 files**.
`lib/demo/flag.ts`'s docstring and the plan are accurate; these three are not.

### minor

- **Demo display name does not follow the demo login.** `demoSignIn()` sets `state.user` but leaves
  `state.displayName` at "Alex Démo": after logging in as `zoe@test.io` the sidebar shows the new
  email while the dashboard greets the old name.
- **`npm run test` runs a real `next build` with side effects.** `next.config.demo-flag.test.ts`
  `rmSync`s `.next` and rebuilds inside the suite (~7 s). Running tests while `npm run dev` is up
  pulls the rug from under the dev server; the build also bypasses `prebuild`. Undocumented.
- **`start:demo` clobbers `.next`** with a demo artifact; a later plain `npm run start` without a
  rebuild then serves the demo build. The README does not warn about it.
- **Demo server actions ship on a normal production build.** `demoLoginAction` / `demoSetRoleAction`
  / `demoSetSubscriptionAction` are registered, reachable POST endpoints and `demo-banner-controls`
  ships to the browser. All three verified inert (`not_demo`). Attack-surface and bundle tidiness
  only — consistent with the documented residual.
- **`lib/demo/state.ts` and `fixtures.ts` carry no `import "server-only"`** though they hold
  server-side session state. Only an erased `import type` crosses into a client component today, and
  no fixture string reaches `.next/static` — a guard would make that structural.
- **Two commits** where AGENTS.md and the plan's DoD say one. Squashed at merge, cosmetic.

## Checklist

- **Plan compliance** — T1–T8 all present, nothing extraneous. T1's and T5's stated verifications are
  not true as shipped (findings 1 and 2).
- **Anti-hallucination** — every import and API opened and verified (`Badge`, `Select`, `TextField`
  satisfying `UseFormRegisterReturn`, `useLogout`, the `Database` row types, Supabase `User`). All
  real, correct signatures. All tokens referenced exist in `app/globals.css`. `lib/demo/state.ts`
  claims per-process semantics that are actually per-module-graph.
- **Rules compliance** — `@/` alias, actions/reads split, identity from `getUser()` never an
  argument, result objects not throws, `components/ui/*` composed, no raw colour, i18n fr+en complete
  (coverage test extended with the 10 `demo` keys). No accepted ADR contradicted.
- **Tests** — 292/292. Assertions are real at unit level, but demo behaviour is tested entirely
  against `vi.mock` of the flag and state modules, which is exactly why the wiring bug is invisible.
  Bite proven by neutralization (forcing `isDemoMode()` false → 2 red; reverting the config → 1 red);
  guard-test bite **disproven** by neutralization (decoy → 0 red).
- **Regressions** — none. The real path on all 13 seams and in `proxy.ts` is unchanged, and the
  production artifact behaves exactly as before.

## Not verified — needs a human at recette

- **Browser interaction.** Every demo journey was driven with `curl` and extracted action IDs, never
  a real browser. The critical finding is one click away: open `dev:demo` with no `.env.local`, click
  "Se déconnecter", then try to log back in with any email.
- **Role switch and simulated subscribe in the UI** — exercised server-side only. Also check the
  banner's layout at mobile widths: it is a `flex-wrap` bar above `{children}` in the root layout.
- **fr/en switch in demo** — not exercised; only `/en/dashboard` 200 was checked.
- **Dark mode** — the banner forces light tokens via `.light-scope`; visually unverified against a
  dark app shell.
- **Pricing → subscribe in demo** — reached by reading that `getPlanByPriceId("")` matches `PLANS[0]`
  when `STRIPE_PRICE_PRO` is unset; never clicked.
- **`npm run start:demo` as one packaged command** on port 3000 — the steps were run by hand.
- **Node version** — everything ran on Node v26.5.0; `.nvmrc` and AGENTS.md say Node 22.

## Verdict — first pass

The security property this story had to get right was sound from the start: the demo path cannot be
reached on a production build, and the real authentication path is untouched on all 13 seams and in
the middleware. But the demo itself did not work as specified — signing out was irreversible.

Max severity: critical · Ship allowed: no

---

# Second pass — after `6e71469` (the cookie fix)

Re-reviewed in fresh context, driving the **real server actions** (action IDs extracted from the
built chunks) against a real `start:demo` artifact with no `.env.local`.

```
A) GET  /dashboard                → 200, "Alex Démo", no cookie yet
B) POST signOutAction             → 200, Set-Cookie demo_session {"email":null,…}
                                          Path=/; HttpOnly; SameSite=lax
C) GET  /dashboard                → 307 → /login?redirect=%2Fdashboard   ← ?redirect= PRESENT
D) POST demoLoginAction           → 200, Set-Cookie {"email":"zoe@test.io",…}
E) GET  /dashboard                → 200, renders zoe
```

Step C carries the discriminator: that redirect came from `proxy.ts`, not the page — the middleware
now observes the sign-out. The loop is closed and the demo is fully recoverable.

Also verified: tampered/malformed cookies fail closed without crashing; the cookie does nothing on a
non-demo artifact (forged admin cookie + `DEMO_MODE=1` at start time → `307 /login?redirect=`, all
three demo actions return `not_demo`); `proxy.ts`'s real branch word-diffs clean against `main`; the
guard test now bites (decoys in `lib/` and `scripts/` both go red); and the demo branch in the built
middleware chunk is guarded by a literal constant (`function(){try{return!1}catch{return!1}}()`).

### major found and fixed in this pass — the fix broke a written criterion

Moving the session into a cookie removed the in-memory half entirely, so demo state **survived a
server restart** — verified by killing and restarting `next start`. Three places asserted the
opposite, including `demo.notice`, the banner text shown in the running UI.

Resolved by human decision (31/08/2026): rather than forcing a reset-on-restart, an explicit
**"Réinitialiser"** control was added (`demoResetAction` → deletes the cookie, so
`parseDemoSession`'s existing fallback is the single source of truth for "reset"), and all three
claims were corrected. Verified by running it: sign in as another email, flip the role, reset →
cookie gone, next request byte-identical to a first visit.

The implementer flagged a contradiction in the fix brief rather than resolving it silently — the
brief asked for role `user` after reset, while the fixtures' actual default is `admin`. It
implemented "byte-identical to a first visit", which is the checkable property. The brief was wrong.

### minors closed in the same commit

Cookie options (`path`, `sameSite`, `httpOnly`) are now asserted — the fake jars silently dropped the
options argument, so a regression on `httpOnly` would have passed. `proxy.ts`'s `let user: unknown`
retyped to an honest union. Plan T3 got a revision note; the DoD now lists `test:build`.

### minors left, deliberately

- The guard-test allowlist has a bounded hole: a decision point added _inside_ one of the two
  allowlisted test files would slip through, as would `process.env["DEMO_MODE"]` bracket form. Both
  are test files, never a production path, and the test comments the trade-off.
- `next.config.demo-flag.test.ts` no longer runs in `npm run test` (it wiped `.next` under any running
  dev server). It runs via `npm run test:build`; with no CI in this repo, both must be wired up or the
  T8 regression goes unguarded. Documented in the README, `vitest.config.ts` and the DoD.
- The demo actions and fixtures still ship in a normal production build (2 chunk files). Verified
  inert. Documented residual of the chosen architecture.
- Four commits on the branch, squashed at merge.

## Not verified — needs a human at recette

- **Browser interaction.** Every journey was driven with `curl` and extracted action IDs. Open
  `npm run dev:demo` with no `.env.local` and click through: sign out, sign back in with any email,
  switch role, simulate the subscription, reset.
- **Banner layout** at mobile widths — it is a `flex-wrap` bar above `{children}` in the root layout,
  and it just gained a button.
- **Dark mode** — the banner forces light tokens via `.light-scope`; unverified against a dark shell.
- **fr/en switch in demo** — only `/en/dashboard` 200 was checked.
- **`npm run start:demo` as one packaged command** on port 3000 — the steps were run by hand.
- Everything requiring live Supabase or Stripe.

## Verdict — final

The critical is closed for real, not on paper, and pinned by a test that drives the real write path
and goes red under neutralization. Both majors are closed. The production artifact is unchanged and
the demo path remains provably unreachable on it.

Max severity: minor
Ship allowed: yes
