# Research — Story s03-auth

## The five structuring facts

1. **The auth is already coded end to end, and the comments say it was fixed on purpose.** Signup really creates an account (`components/auth/signup-form.tsx:39` `supabase.auth.signUp`), login authenticates (`components/auth/login-form.tsx:31` `signInWithPassword`), logout purges the session client + server (`lib/hooks/use-logout.ts:32,39`, `lib/actions/sign-out.ts:21` `signOut({ scope: "local" })`). The comments at `signup-form.tsx:32-34` and `google-button.tsx:6-8` explicitly record that these were dead in the Applyzi prototype and were wired up. This story is **VERIFY + TEST**, not build.
2. **The post-login destination and the protected route already physically exist — on `main`, not in this branch.** `app/[locale]/(app)/dashboard/page.tsx`, `(app)/layout.tsx`, and the whole `components/app/*` shell (sidebar, header, mobile-sidebar) are tracked on `main` (`git ls-tree main`), and `git diff main...HEAD` is **empty**. So AC2's "redirects to the dashboard" and AC3's "any protected route redirects to login" have a real target _today_ — the s04 dependency is softer than the story implies (see fact 5 and Open questions).
3. **Session/SSR + route protection live in `proxy.ts` (the renamed Next 16 middleware) and already work.** `PROTECTED = ["/dashboard", "/settings"]` (`proxy.ts:9`); it refreshes the Supabase session with nothing between `createServerClient` and `getUser()` (`proxy.ts:18-41`), redirects unauth→`/login?redirect=<path>` (`proxy.ts:51-56`) and auth-on-login/signup→`/dashboard` (`proxy.ts:59-64`). SSR persistence (AC4) is this refresh plus the three typed clients in `lib/supabase/{client,server,service-role}.ts`.
4. **Email confirmation is the one behaviour that can break AC1.** `signUp` opens a session only if Supabase's "confirm email" is OFF; the form handles the ON case by showing `authErrorConfirmEmail` instead of navigating (`signup-form.tsx:57-61`). Whether AC1 ("creates a user _and opens a session_") passes depends on a **Supabase dashboard setting**, not on code — this is the sharpest open question for planning.
5. **i18n coverage for auth is already complete and symmetric.** The `auth` (24 keys), `forgot`, and `newPassword` namespaces exist identically in `messages/fr.json` and `messages/en.json`; every key the forms call (`authErrorInvalid`, `authErrorConfirmEmail`, `authErrorEmailTaken`, `loginPending`, `forgotLink`…) is present in both. No hardcoded UI string and no CV-domain copy survives in the auth screens; navigation uses `@/i18n/navigation` (`login-form.tsx:7`), never `next/link` (grep: none). Neutralisation of the auth screens is essentially **already done**.

## Target story

**As an** end-user of a forked SaaS, **I want** to sign up, log in and log out, **so that** I access the app securely. Complexity scored **2** (`docs/stories.md:57-75`).

Acceptance criteria:

- **AC1** — Email/password signup creates a Supabase user and opens a session. Code present (`signup-form.tsx:39`); "opens a session" is gated by the Supabase email-confirmation setting (fact 4).
- **AC2** — Login authenticates and redirects to the dashboard; invalid credentials show an error and do NOT log in. Code present: `signInWithPassword` (`login-form.tsx:31`), invalid → `authErrorInvalid` + no navigation (`login-form.tsx:35-39`), success → hard-nav to `/dashboard` or `?redirect` target (`login-form.tsx:43-58`).
- **AC3** — Logout clears the session; any protected route then redirects to login. Code present: `useLogout` (client `signOut` + `signOutAction`) then `/login` (`use-logout.ts:31-41`); `proxy.ts:51-56` does the redirect.
- **AC4** — Session persists across reload (SSR). Provided by `proxy.ts:18-41` refresh + `lib/supabase/server.ts:8-32` cookie-bound SSR client.

Note: the story lists three screens (signup, login, logout). The fork also ships `mot-de-passe-oublie` + `nouveau-mot-de-passe` (password reset) — **out of the story's stated scope** but wired and passing typecheck; treat as bonus surface to leave working, not to test as AC.

## Current state of the code

Everything below exists and compiles today (`tsc --noEmit` exit 0; `vitest run` 16/16 green in 5 files; `check-design-tokens` green at 70 files).

- **Screens (RSC pages)** — `app/[locale]/login/page.tsx` and `signup/page.tsx`: identical shape, `setRequestLocale` + `getTranslations("auth")`, render `<AuthShell footer={t("footer")}>` around `<LoginForm/>`/`<SignupForm/>`. `mot-de-passe-oublie/page.tsx` + `nouveau-mot-de-passe/page.tsx` similar (`auth` namespace).
- **Forms (client)** — `components/auth/login-form.tsx`, `signup-form.tsx`, `forgot-password-form.tsx`, `new-password-form.tsx`: all react-hook-form + `zodResolver(loginSchema|signupSchema)` from `components/auth/schemas.ts`, `mode:"onBlur"`, errors resolved as i18n keys.
- **Schemas** — `components/auth/schemas.ts:6-17`: `loginSchema` (email + password min 1), `signupSchema` (name min 1, email, password min 8). Error strings are i18n keys (`authErrorEmail`, `authErrorRequired`, `authErrorPassword`). Comment (line 4): "Server-importable (a future Server Action can safeParse the same schema)."
- **Supabase clients** — `lib/supabase/client.ts` (`createBrowserClient<Database>`), `server.ts` (`createServerClient<Database>` + `getUser()` returning `User|null`, `server.ts:35-43`), `service-role.ts` (`createServiceRoleClient`, throws if `SUPABASE_SERVICE_ROLE_KEY` missing). All typed `<Database>` from `@/database.types`.
- **Server action** — `lib/actions/sign-out.ts` (`"use server"`, `signOutAction()` → `signOut({ scope:"local" })`). `lib/actions/password-reset.ts` (`requestPasswordReset`, anti-enumeration, always `{ok:true}`).
- **Logout hook** — `lib/hooks/use-logout.ts` (`useLogout()` → `{ logout, signingOut }`; calls client `signOut` then `signOutAction`, then `window.location.assign("/login")`).
- **OAuth callback** — `app/api/auth/callback/route.ts` (`GET`, `force-dynamic`): `code`→`exchangeCodeForSession`, `token_hash`+`type`→`verifyOtp`, sanitised internal `next` redirect, failure→`/login?error=link`. Under `app/api/` deliberately (proxy matcher excludes `api`).
- **Google OAuth** — `components/auth/google-button.tsx` (`signInWithOAuth({provider:"google", options:{redirectTo: <origin>/api/auth/callback}})`). Real, not decorative (comment line 6).
- **Middleware** — `proxy.ts` (71 lines) as described in fact 3. Matcher `["/((?!api|_next|_vercel|.*\\..*).*)"]` (`proxy.ts:70`).
- **Post-login layer (s04-owned but present)** — `(app)/layout.tsx` calls `getUser()`, `ensureProfile(user.id, …)` (`lib/data/ensure-profile.ts`, service-role upsert into `profiles`), builds sidebar identity via `lib/data/identity.ts`; `(app)/dashboard/page.tsx` re-checks `getUser()` and `redirect({href:"/login"})` if null.
- **DB** — `supabase/migrations/0001_baseline.sql` already creates `public.profiles` (PK = `auth.users.id`, RLS: select/insert/update own). `role` (s05) and `subscriptions` (s06) explicitly deferred by comment. No migration is needed for s03.
- **i18n** — `messages/fr.json` / `en.json` `auth` namespace, 24 keys, identical set both locales.

## Anchor points

Where s03 work (tests + any wiring/neutralisation) plugs in:

- **Login flow**: `components/auth/login-form.tsx:27-59` (submit) — the AC2 logic (auth, invalid→error, redirect).
- **Signup flow**: `components/auth/signup-form.tsx:35-71` (submit) — AC1, including the no-session/confirm-email branch.
- **Logout flow**: `lib/hooks/use-logout.ts:28-42` + `lib/actions/sign-out.ts:18-26` — AC3 clearing.
- **Protection + SSR**: `proxy.ts:9,48-64` (PROTECTED list, both redirects) + `lib/supabase/server.ts:35-43` (`getUser`) — AC3 redirect and AC4 persistence.
- **Schemas** (test target for validation): `components/auth/schemas.ts:6-17`.
- **Test convention to mirror**: `lib/actions/settings.test.ts:1-51` — `vi.mock("@/lib/supabase/server", …)` mocking `getUser`/`createClient`, colocated `*.test.ts`, `@/` alias.

## Verified APIs / functions

Quoted from files opened:

- `createClient(): SupabaseClient<Database>` — `lib/supabase/client.ts:7` (browser).
- `createClient(): Promise<SupabaseClient<Database>>` — `lib/supabase/server.ts:8` (SSR, cookie-bound).
- `getUser(): Promise<User | null>` — `lib/supabase/server.ts:35`.
- `createServiceRoleClient(): SupabaseClient<Database>` — `lib/supabase/service-role.ts:9` (throws without key).
- `signOutAction(): Promise<void>` — `lib/actions/sign-out.ts:18` (`"use server"`).
- `useLogout(): { logout: () => Promise<void>; signingOut: boolean }` — `lib/hooks/use-logout.ts:25`.
- `requestPasswordReset(email: string): Promise<{ ok: true }>` — `lib/actions/password-reset.ts:15`.
- `GET(req: NextRequest): Promise<NextResponse>` — `app/api/auth/callback/route.ts:20`.
- `ensureProfile(userId, { fullName? }): Promise<void>` — `lib/data/ensure-profile.ts:14`.
- Supabase SDK calls actually used: `auth.signUp({ email, password, options:{ data } })`, `auth.signInWithPassword({ email, password })`, `auth.signInWithOAuth({ provider, options:{ redirectTo } })`, `auth.signOut({ scope })`, `auth.exchangeCodeForSession(code)`, `auth.verifyOtp({ type, token_hash })`, `auth.resetPasswordForEmail(email, { redirectTo })`, `auth.getUser()`.
- `loginSchema` / `signupSchema` + inferred `LoginValues` / `SignupValues` — `components/auth/schemas.ts:6,10,12,17`.

## Traps & constraints

- **Email confirmation (AC1 pivot).** `signUp` returns `data.session === null` when Supabase "Confirm email" is enabled; the form then shows `authErrorConfirmEmail` and does NOT navigate (`signup-form.tsx:57-61`). AC1 says "creates a user _and opens a session_". Whether that passes is a **Supabase project setting**, unverifiable from code alone. Any automated test must mock `signUp` to return a session; a real E2E depends on the dashboard config. Flag as a plan decision, don't silently assume.
- **No auth tests exist.** Grep of `*.test.ts` → 5 files, none touch auth (`logo`, `cn`, `settings` action, two `messages`). AC1–AC4 have **zero** coverage today. The only ready-made mocking pattern is `settings.test.ts`. Testing client forms (RHF + browser Supabase + `window.location.assign`) is harder than testing a server action — expect the plan to target `schemas`, `sign-out` action, and possibly proxy logic as the unit-testable surface, with form behaviour as the gap.
- **`window.location.assign` everywhere on success** (`login-form.tsx:58`, `signup-form.tsx:70`, `use-logout.ts:41`). Deliberate (comments explain: `router.push`+`refresh()` races the freshly-written session cookie and cancels the navigation). Do NOT "modernise" these to the i18n router — it reintroduces the documented bug. Also makes jsdom testing of navigation awkward (must mock `window.location`).
- **s04 boundary — the load-bearing planning question.** The `(app)` shell, dashboard and `ensureProfile` are on `main` today, so s03's redirects have a real target. BUT `(app)/layout.tsx:23-31` runs `ensureProfile` via **service-role** on every authed render — if `SUPABASE_SERVICE_ROLE_KEY` is absent, `createServiceRoleClient` throws (`service-role.ts:11-14`) and the dashboard 500s _after_ login, which would look like an s03 failure. s03 legitimately closes: signup/login/logout mechanics, invalid-creds rejection, unauth→login redirect, SSR persistence. What leans on s04: the _content/shape_ of the dashboard landing and the profile-provisioning side-effect. Recommend s03 asserts the redirect + a session cookie, and treats the dashboard body as s04's concern.
- **Design-token guard gates the build** (`prebuild`, `package.json:11`). The only raw colours in auth are Google's 4 brand hexes in `google-button.tsx:52-70`, each carrying a `design-tokens-allow` comment — guard passes (green, 8 allowlisted). Any new auth markup must stay tokens-only (compose `components/ui/*`; forms already use `Button`, `TextField`).
- **Google OAuth is IN the code but arguably out of story scope.** The story names only email/password (signup/login/logout). The button is functional but requires a Google provider configured in Supabase; with none, `signInWithOAuth` errors and re-arms the button (`google-button.tsx:37-40`). Not dead code, not an AC. Leave working; don't gold-plate a test for it.
- **`?error=link` not surfaced.** The callback redirects failures to `/login?error=link` (`route.ts:50`) but `login-form.tsx` / login page never read `error` — a broken magic link lands on login with no message. Minor UX gap, adjacent to the story, not an AC. Note, don't necessarily fix.
- **`resetPasswordForEmail` redirect needs `NEXT_PUBLIC_APP_URL`** (`password-reset.ts:19-27`); undefined → `redirectTo: undefined` → Supabase uses its own Site URL. Password reset is out of scope but this is an env dependency to note.

## Open questions

1. **Is Supabase email-confirmation ON or OFF for this project?** Decides whether AC1's "opens a session" is literally true after `signUp`, or whether the correct AC1 behaviour is the confirm-email path. Must be settled before writing the AC1 test/assertion.
2. **How much of AC1–AC4 is provable by unit test vs. needs a live Supabase / E2E?** The forms are client components doing real network + hard navigation; the cleanly unit-testable pieces are `schemas`, `signOutAction`, and `proxy` protection logic. Plan must decide the test altitude (unit + mocks, or add a lightweight integration harness).
3. **Does s03 own the dashboard-render-after-login, or only the redirect?** The `ensureProfile` service-role side-effect (fact/trap above) sits in s04's layout. Confirm s03's DoD stops at "session established + redirected", leaving dashboard content to s04.
4. **Env readiness**: are `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` set locally? Login can succeed while the post-login dashboard 500s without the service-role key.

## Real complexity

**Confirmed 2** — arguably closer to **1.5**. The story was scored 2 before anyone opened a file; after opening every auth file, the finding is that the mechanics are **already implemented and compile/test/lint green**, with the "we fixed the dead prototype" work already recorded in the comments. The remaining work is genuinely small and bounded:

- Add the missing test coverage for AC1–AC4 (none exists today) — the real deliverable, mirroring `settings.test.ts`.
- Resolve the email-confirmation setting and pin AC1's expected behaviour accordingly.
- Verify (and only lightly wire, if anything) the redirect-to-login-on-unauth and SSR-persistence paths against the real proxy.
- No new screens, no new i18n keys, no migration, no design-token risk beyond staying tokens-only.

It does **not** reach 3 (no build/strip risk like s01, no guard-extension like s02) and stays well under 5. **No split proposal** (verdict ≠ 5). The one thing that could inflate it is choosing a heavy E2E harness for the client forms; keeping the tests at unit altitude (schemas + server action + proxy logic) holds it at 2.

## Split proposal

Not required — complexity verdict is 2, not 5.
