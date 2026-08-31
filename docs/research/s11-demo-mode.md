# Research — Story s11-demo-mode

Branch: `feature/s11-demo-mode` · Base: `main` @ `74f2ee2` (s01→s10 merged)

## The actual problem

Not "how do I fake data" — that part is easy. The problem is that demo mode is a **second
execution path through the auth boundary**, and the failure that matters is not a broken demo,
it is a demo path reachable in production. One misplaced condition and anyone bypasses
authentication. Every design decision below is subordinated to that.

## The seam surface — enumerated, not estimated

Everything that touches Supabase or Stripe at runtime, from `git grep`:

**Identity** — `lib/supabase/server.ts`

- `createClient()` — builds the SSR client from `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` (non-null
  asserted, so missing env = runtime crash, not a clean error)
- `getUser()` — the single identity source. Called by 4 pages (`(app)/layout`, `dashboard`,
  `settings`, `admin`) and by `lib/actions/{checkout,settings}`, `lib/data/{identity,subscription}`.

**Reads** — `lib/data/`

- `identity.ts` → `getDisplayName`, `getAvatarUrl`, `getRole` (all query `profiles`)
  — plus two **pure** helpers, `isAdmin` and `initialsOf`, which need no demo treatment
- `dashboard.ts` → `loadDashboard(userId)`
- `subscription.ts` → `getSubscription(userId)`; `isActiveSubscriber(status)` is pure
- `ensure-profile.ts` → `ensureProfile(...)` (service-role upsert)

**Writes** — `lib/actions/`

- `checkout.ts` → `createCheckoutSession` (Stripe)
- `settings.ts` → `updateSettingsProfile`, `changePassword`, `deleteAccount`
- `sign-out.ts` → `signOutAction`
- `password-reset.ts` → `requestPasswordReset`

**Edge** — `proxy.ts`

- `PROTECTED = ["/dashboard", "/settings", "/admin"]`, its own `createServerClient`, and the
  hard rule (line 39) that nothing may run between `createServerClient` and `getUser()`.

**Stripe** — `lib/stripe/client.ts` (`getStripe()`, throws `STRIPE_KEY_MISSING`),
`lib/stripe/config.ts` (`PLANS` — pure data, already demo-safe).

That is **13 functions**, all server-side, all behind four modules. Small enough to swap
exhaustively; large enough that scattering `if (demo)` through components would be a mistake.

## Env vars that make the app crash when absent

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`,
`NEXT_PUBLIC_SITE_URL`. Demo mode must satisfy the app without any of them.

## Options considered

**A — fake the Supabase client.** Make `createClient()` return an object mimicking the query
builder. One seam, but it means reimplementing `.from().select().eq().maybeSingle()` chains and
their overloads. Brittle, and it silently diverges the moment a story adds a query shape.
**Rejected.**

**B — swap at the data/action layer.** Each of the 13 functions delegates to a demo
implementation when the flag is on. More call sites, but every one is a plain typed function
returning `Database`-typed data — the compiler checks the fixtures against the real schema.
The `if` lives in the module that owns the operation, never in a component. **Retained.**

**C — a parallel route group.** Duplicate the screens. Rejected outright: it doubles the UI
surface and guarantees drift between what you review in demo and what ships.

## The safety design (the part that matters)

- **One flag, one reader.** `process.env.DEMO_MODE` is read in exactly one module, exported as
  a boolean. Nothing else in the codebase may read that variable — enforceable by a guard test,
  the same shape as the `public/` guard added in s10.
- **Fail-closed on production.** The demo module must refuse to activate when `NODE_ENV` is
  `production` **unless** an explicit second opt-in is present, so that a stray `DEMO_MODE=1` in a
  hosting dashboard cannot silently unauthenticate a real deployment. `start:demo` is the
  legitimate case and must opt in deliberately.
- **The negative test is the important one.** With the flag unset, assert every demo entry point
  is unreachable and the real path is byte-for-byte what it was. This is the acceptance criterion
  most likely to be skipped and the only one that protects production.
- **`proxy.ts` is the sharpest edge.** It runs on every request and carries an explicit rule
  against inserting anything between `createServerClient` and `getUser()`. The demo branch must
  return _before_ that block is entered, never inside it.

## Traps

- `getUser()` returns a Supabase `User`. The demo fixture must satisfy that type, not a subset —
  `app/(app)/layout.tsx` and `settings` read `user_metadata` and `email`.
- `deleteAccount` and `changePassword` must not appear to succeed against nothing; in demo they
  should mutate the in-memory state visibly, or refuse with a clear demo-specific message.
- The Stripe webhook route needs no demo path (nothing calls it in demo) but must not crash at
  import time when `STRIPE_WEBHOOK_SECRET` is absent.
- `ensureProfile` uses the service-role client — the one module carrying `import "server-only"`
  since s10. The demo swap must not weaken that guard.
- Cookies are the only place demo session state can live across requests; `cookies()` is available
  in actions and RSC but the store is request-scoped. Module-level mutable state persists per
  server process in dev — acceptable per the story, but it must not be assumed in `next start`
  with multiple workers.

## Out of scope

Re-theming, the `pine`/`lime` token rename, the 4 inherited lint warnings, anything requiring a
real Supabase or Stripe call.
