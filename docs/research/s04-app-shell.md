# Research — Story s04-app-shell

## The five structuring facts

1. **The whole protected shell already exists and is tracked on `main` — this branch has an empty diff.** `git diff main...HEAD --stat` returns nothing; `git ls-tree main` lists `app/[locale]/(app)/{layout.tsx,dashboard,settings}` and every `components/app/*` file. So s04 is **VERIFY + TEST + one real gap-fill**, not build. The build is green: `check-design-tokens` passes at 72 files, no arbitrary values.

2. **AC1 (unauth `/dashboard` → login) is already closed at TWO altitudes, and it's already tested.** The middleware `proxy.ts:9` lists `PROTECTED = ["/dashboard", "/settings"]` and redirects unauth→`/login?redirect=<path>` (`proxy.ts:48-56`); `proxy.test.ts:57-77` (added by s03) proves exactly this for `/fr/dashboard` and nested `/fr/settings/profile` (status 307, location contains `/fr/login` + `redirect=`). The dashboard page **also** re-guards server-side: `getUser()` → `redirect({ href: "/login" })` if null (`app/[locale]/(app)/dashboard/page.tsx:19-22`). Defence in depth is present.

3. **AC2's "email affiché" is the one REAL gap: the email is never rendered in the shell.** The sidebar user badge shows a _display name_, not the email — `SidebarNav` renders `displayName = name ?? t("accountFallback")` (`app-sidebar.tsx:64-66,176-178`), where `name` comes from `getDisplayName()`, which prefers `profiles.display_name`, then signup metadata, then only the **local-part** of the email with the domain stripped (`lib/data/identity.ts:29-30`). The full `user.email` is read in the layout (`(app)/layout.tsx:40`) and settings page (`settings/page.tsx:24`) but _only passed as a fallback source into `getDisplayName`_ — it is never displayed. There is no `appNav.email` i18n key and no email element anywhere in `components/app/*`. AC2 as written ("email affiché") is **not satisfied** by the current shell.

4. **AC2's logout action is fully wired and correct; the "user menu" is a sidebar badge, not a dropdown.** The logout button lives in `SidebarNav` (`app-sidebar.tsx:180-202`, `onClick={logout}`, `aria-label={t("logout")}`), backed by `useLogout()` (`lib/hooks/use-logout.ts:25-45`) which calls client `signOut()` **and** the `signOutAction` server action, then hard-navigates to `/login`. There is no separate "user menu" component — the account badge + logout button in the sidebar footer IS the user menu. Whether "email affiché" must sit next to this badge is the main design decision for AC2 (see Open questions).

5. **AC3 (tokens-only) is already GREEN — no raw colour survives in the shell.** `grep -E '#hex|rgb|hsl'` over `components/app/` returns nothing; the guard reports 72 files clean, 8 allowlisted (none in the shell). Every class the shell uses (`bg-sand`, `bg-pine`, `bg-lime`, `text-ink-strong`, `text-on-pine`, `border-line`, `text-muted`, `bg-paper`, `bg-pine-900`, `text-paper`) resolves to a `--color-*` token defined in `app/globals.css` `@theme` (`globals.css:16-44`). AC3 needs verification, not remediation — and any email element added for AC2 must stay tokens-only or the prebuild guard breaks the build.

## Target story

**As a** logged-in user **I want** a protected app layout with nav and a user menu **so that** I have a space to plug features into. Scored **2** (`docs/stories.md:79-96`).

Acceptance criteria:

- **AC1** — Unauthenticated access to `/dashboard` (protected) redirects to login. **Already closed** — middleware (`proxy.ts:48-56`) + server re-guard (`dashboard/page.tsx:19-22`); tested (`proxy.test.ts:57-66`).
- **AC2** — A logged-in user sees the layout with navigation + user menu (**email shown**, logout action). Nav ✅ (`app-sidebar.tsx:29-32,122-152`), logout ✅ (`app-sidebar.tsx:180-202` + `use-logout.ts`), **email shown ❌ — the real work** (fact 3).
- **AC3** — The layout uses ONLY design tokens (no raw colours). **Already satisfied** — guard green, zero raw colours in `components/app/*` (fact 5).

## Current state of the code

Everything below is on `main` and compiles/lints green today.

- **Protected layout** — `app/[locale]/(app)/layout.tsx`: `setRequestLocale`, `getUser()`, then on a user runs `ensureProfile(user.id, …)` (service-role upsert, `layout.tsx:23-31`), computes `displayName` via `getDisplayName` and `photoUrl` via `getAvatarUrl`, reads the sidebar-collapsed cookie, renders `<AppShell user={{ name, initials, photoUrl }} …>`. **The layout itself does not redirect on unauth** — it relies on the middleware; the per-page `getUser()` re-guard does the server-side redirect (`dashboard/page.tsx:19-22`). Note: `user.email` is read (`layout.tsx:40`) only to feed `getDisplayName`, never passed to `AppShell`.
- **App shell** — `components/app/app-shell.tsx`: client root, owns dark-mode flag (localStorage) + a `UserContext` of `{ name, initials, photoUrl }` (`app-shell.tsx:17-28`) — **email is not a field of `AppUser`**. Renders `<AppSidebar>` + `<main>`. Tokens: `bg-pine`, `bg-sand`, `text-ink` (`app-shell.tsx:62-64`).
- **Sidebar** — `components/app/app-sidebar.tsx`: `SidebarNav` (nav items `dashboard`,`settings` — `ITEMS`, lines 29-32), account badge → `/settings` link showing avatar + `displayName` (lines 166-179), logout button (lines 180-202). Uses `@/i18n/navigation` `Link`/`usePathname` (line 7), `useTranslations("appNav")` (line 63), `useAppUser()` (line 65). Desktop `<aside>` + collapse persisted to cookie (lines 213-236).
- **Header** — `components/app/app-header.tsx`: sticky top-bar, `<MobileSidebar>` + page title + optional actions + `<DarkModeToggle>`. Tokens only (`border-line`, `bg-sand`, `text-ink-strong`).
- **Mobile sidebar** — `components/app/mobile-sidebar.tsx`: hamburger → portal drawer to `<body>` rendering the same `SidebarNav`. Long comment at line 14 still says "cartes CV (z-20)" — a **cosmetic CV-domain leftover** in a comment (only surviving `cv` mention in the shell).
- **Dark-mode toggle** — `components/app/dark-mode-toggle.tsx`: sun/moon button, `useDarkMode()` from the shell context, `appNav.themeDark`/`themeLight` labels. Tokens only.
- **Pages** — `dashboard/page.tsx` (`getUser()` re-guard, `AppHeader` + `dashboard.greeting`/`subtitle` via `loadDashboard`), `settings/page.tsx` (`AppHeader` + `SettingsForm`).
- **Data** — `lib/data/identity.ts` (`getDisplayName`, `getAvatarUrl`, `initialsOf`), `lib/data/dashboard.ts` (`loadDashboard` → `{ displayName }`), `lib/data/ensure-profile.ts` (`ensureProfile`, service-role, best-effort).
- **Middleware** — `proxy.ts` (Next 16 rename): PROTECTED list + both redirects (lines 48-64), matcher excludes `api|_next|_vercel|.*\..*` (line 70).
- **i18n** — `appNav` namespace, 8 keys, **identical in fr and en** (`messages/fr.json:6-15`, `messages/en.json:6-15`): `dashboard, settings, collapse, expand, logout, themeDark, themeLight, accountFallback`. **No `email` key.** `dashboard` namespace has `greeting`/`subtitle` in both locales.

## Anchor points

Where s04 work (test + the AC2 email fill) plugs in:

- **AC2 email display** — `components/app/app-sidebar.tsx:166-179` (the account badge block, where an email line would naturally go), fed by the `UserContext`/`AppUser` type in `components/app/app-shell.tsx:17-28` (add an `email` field), populated from `app/[locale]/(app)/layout.tsx:37-51` (pass `user.email` into `<AppShell user={…}>`). New i18n: none strictly required to _show_ an email string, but an aria/label key would live in `messages/{fr,en}.json` `appNav`.
- **AC1 verification** — `proxy.ts:48-56` + `proxy.test.ts:57-77` (already covers it); `app/[locale]/(app)/dashboard/page.tsx:19-22` (server re-guard, currently untested).
- **AC2 logout** — `components/app/app-sidebar.tsx:180-202` + `lib/hooks/use-logout.ts:28-42`.
- **AC3** — `app/globals.css:16-44` (`@theme` token definitions) + `scripts/check-design-tokens.mjs` (prebuild guard).
- **Test convention to mirror** — `proxy.test.ts` (mock `@supabase/ssr` + `next-intl/middleware`, drive the real export) and `lib/actions/settings.test.ts` (mock `@/lib/supabase/server`).

## Verified APIs / functions

Quoted from files opened:

- `getUser(): Promise<User | null>` — `lib/supabase/server.ts:35` (used by layout + both pages; `User.email` is `string | undefined`).
- `getDisplayName(userId, { fullName?, email? }): Promise<string | null>` — `lib/data/identity.ts:12` (email only used as `email.split("@")[0]` local-part fallback, line 29).
- `getAvatarUrl(userId): Promise<string | null>` — `lib/data/identity.ts:38`.
- `initialsOf(name: string | null): string` — `lib/data/identity.ts:52`.
- `ensureProfile(userId, { fullName? }): Promise<void>` — `lib/data/ensure-profile.ts:14` (service-role, **best-effort: swallows errors, only `console.error`**, lines 29-30).
- `loadDashboard(userId): Promise<{ displayName: string }>` — `lib/data/dashboard.ts:13`.
- `useLogout(): { logout: () => Promise<void>; signingOut: boolean }` — `lib/hooks/use-logout.ts:25`.
- `useAppUser(): { name: string|null; initials: string; photoUrl?: string|null }` — `components/app/app-shell.tsx:28` (context; **no `email`**).
- `AppShell({ children, user, sidebarCollapsed })` — `components/app/app-shell.tsx:36`; `AppSidebar({ initialCollapsed })` — `app-sidebar.tsx:213`; `SidebarNav({ collapsed?, onToggleCollapse?, onNavigate? })` — `app-sidebar.tsx:54`.
- `proxy(request): Promise<NextResponse>` — `proxy.ts:13`; `PROTECTED = ["/dashboard","/settings"]` — `proxy.ts:9`.

## Traps & constraints

- **`ensureProfile` service-role side-effect throws-then-swallows — but only best-effort here (unlike s03's read).** `(app)/layout.tsx:28` calls `ensureProfile`, which calls `createServiceRoleClient()`. That client **throws if `SUPABASE_SERVICE_ROLE_KEY` is missing** (`lib/supabase/service-role.ts`, flagged by s03 research fact/trap). `ensureProfile` itself catches the _query_ error but the `createServiceRoleClient()` **throw happens before the try**, so a missing key still 500s the layout on every authed render. This is the sharpest AC2 trap: with the env var absent, a logged-in user gets a 500 instead of the shell — AC2 fails for an environmental reason, not a code reason. Confirm the key is set locally before asserting AC2 by render; unit tests must mock `ensureProfile`/`createServiceRoleClient`.
- **AC2 "email affiché" is genuinely unmet — do not hand-wave it.** The reviewer will check for the literal email. The current badge shows a name (or the email local-part with the `@domain` stripped, or the `accountFallback` "Mon compte" label). A plausible-looking "it shows the account" is not "email shown". The fix is small (thread `user.email` → `AppUser` → sidebar badge) but it IS a code change, and it must stay tokens-only.
- **next-intl navigation law.** Sidebar uses `@/i18n/navigation` `Link`/`usePathname` (`app-sidebar.tsx:7`), logout uses `window.location.assign("/login")` deliberately (`use-logout.ts:41`, comment explains a `router.push` would keep the previous account's React cache on a shared machine — do NOT "modernise" it). Any new link stays on `@/i18n/navigation`.
- **The "user menu" is the sidebar footer badge, not a dropdown.** Don't build a new dropdown component to satisfy AC2 (would risk inventing UI outside the design system). Compose the existing badge; add the email line inside `app-sidebar.tsx:166-179`.
- **Design-token guard gates the prebuild** (`package.json` prebuild → `check-design-tokens.mjs`). Green at 72 files today. A raw colour or a bare palette utility added for the email line breaks the build.
- **Existing tests are thin for s04.** Only `proxy.test.ts` touches the shell (AC1 middleware decision). **Untested today:** the server re-guard in `dashboard/page.tsx`, the sidebar rendering (nav items, email, logout button), and `getDisplayName`/`initialsOf`. `initialsOf` is a pure function — the cheapest unit-test target.
- **Cosmetic CV leftover.** `mobile-sidebar.tsx:14` comment mentions "cartes CV (z-20)". Harmless (a comment), but it's the last `cv` token in the shell — trivial to neutralise while here.
- **Two dashboard "display name" reads diverge slightly.** `loadDashboard` (`dashboard.ts`) returns only `display_name` (no email/meta fallback), while the sidebar's `getDisplayName` has the full fallback chain. Not a bug for s04, but note the greeting can be empty where the sidebar badge is not.

## Open questions

1. **Where must the email appear to satisfy AC2?** Inline under the name in the sidebar badge (`app-sidebar.tsx:175-179`) is the natural spot and matches "user menu (email shown)". Confirm at design/plan whether the collapsed sidebar and the mobile drawer must also show it, or only the expanded badge. (Design step may be warranted — this is a UI story with a real visible change.)
2. **Is `SUPABASE_SERVICE_ROLE_KEY` set in the local/CI env?** If not, the authed layout 500s via `ensureProfile` before AC2 can be observed by render. Decide test altitude accordingly (mock it) and note the env dependency for a live check.
3. **Does s04 add tests for the server re-guard and the sidebar, or lean on the existing `proxy.test.ts` for AC1?** AC1 is arguably already tested; AC2/AC3 have no test. Plan should pick the unit-testable surface (`initialsOf`, sidebar render with a mocked user showing the email, guard-green assertion) vs. relying on manual verification.
4. **Does "email affiché" need its own i18n label** (e.g. an aria-label), or is the raw email string enough? The email itself isn't translatable; a surrounding label would need fr+en keys (s08 later verifies coverage).

## Real complexity

**Confirmed 2 — arguably 1.5.** Scored 2 before any file was opened; after opening the whole shell, AC1 and AC3 are **already met** (middleware + server re-guard tested for AC1; zero raw colours, guard green for AC3), and AC2 is 90% met (nav ✅, logout ✅). The only genuine deliverable is **AC2's "email shown"**: thread `user.email` from `(app)/layout.tsx` through the `AppUser` context (`app-shell.tsx:17-28`) into the sidebar badge (`app-sidebar.tsx:166-179`), tokens-only — a small, bounded change — plus tests to pin AC1–AC3 at unit altitude (mirror `proxy.test.ts`) and the trivial `mobile-sidebar.tsx:14` comment neutralisation. No new screen, no migration, no design-system gap (compose the existing badge). It does not approach 3 (no strip/build risk like s01, no guard extension like s02) and is nowhere near 5. The only thing that could inflate it is the `ensureProfile` env trap turning AC2 into an environment debug — handled by mocking in tests and noting the env dependency for the live check. **No split proposal** (verdict ≠ 5).

## Split proposal

Not required — complexity verdict is 2, not 5.
