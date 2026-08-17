---
validated: yes
---

# Plan — Story s04-app-shell

Branch: `feature/s04-app-shell`
Research: `docs/research/s04-app-shell.md` — read it first; this plan does not repeat it.

## Target story

**As a** logged-in user **I want** a protected app layout with nav and a user menu **so that** I have a space to plug features into. (`docs/stories.md` → "Story s04-app-shell", scored 2.)

Acceptance criteria:

- **AC1** — Unauthenticated access to `/dashboard` (protected) redirects to login. **Already met** — `proxy.ts` PROTECTED redirect + server re-guard in `dashboard/page.tsx`, pinned by `proxy.test.ts:57-77`. This plan does NOT re-implement it.
- **AC2** — A logged-in user sees the layout with navigation + user menu (**email shown**, logout action). Nav ✅, logout ✅ (`use-logout.ts`), **email shown ❌ — the one real deliverable** (research fact 3).
- **AC3** — The layout uses ONLY design tokens (no raw colours). **Already met** — `check-design-tokens` green, zero raw colour in `components/app/*`. Any element added for AC2 must stay tokens-only.

The whole shell already exists on `main` and compiles green. s04 = one bounded AC2 gap-fill (thread `user.email` into the sidebar badge) + tests that pin AC1–AC3 + one comment cleanup. No new screen, no migration, no design-system gap.

## Tasks (ordered)

1. [x] **Add `email` to the `AppUser` context** — `components/app/app-shell.tsx:17-27`. Add `email?: string | null` to the `AppUser` type (after `photoUrl`) and to the `UserContext` default (`email: null`). Additive only: `useAppUser`, `AppShell` props, and the two providers are untouched otherwise. This is the single source of the thread.

2. [x] **Populate `email` from the layout** — `app/[locale]/(app)/layout.tsx:48-52`. In the `<AppShell user={{ … }}>` object, add `email: user.email ?? null`. `user.email` is already read at line 40 for `getDisplayName`; this reuses the same value — no new `getUser`/DB call. Guard for the unauth branch is implicit (`user` is truthy inside the shell path; when `user` is null every field is already null/derived).

3. [x] **Render the email in the expanded sidebar badge** — `components/app/app-sidebar.tsx:65,175-179`. Destructure `email` from `useAppUser()` (line 65). Inside the expanded badge's name block (the `<div className="min-w-0 flex-1 leading-tight">`, lines 175-179), add a second line under the `displayName` `<p>` that renders `email` when present: `{email ? <p className="truncate text-xs text-on-pine">{email}</p> : null}`. Tokens only — reuse `text-on-pine` (already used in this file) and `truncate`; NO new colour, NO raw hex, NO bare palette utility. The collapsed rail and the avatar-only mobile state keep showing only the avatar (email has no room there — see "The point everything turns on"); do NOT add the email to the collapsed branch (lines 157-165).

4. [x] **Neutralise the CV-domain comment** — `components/app/mobile-sidebar.tsx:14`. The line `* reste de la page, l'ensemble restait plafonné à z-10. Les cartes CV (z-20)` and its continuation on line 15-16 reference "cartes CV … badges … boutons « Éditer / Télécharger »" (killed Applyzi domain). Rewrite the stacking-context explanation with a domain-neutral example (e.g. "un contenu de page en `z-20`") — keep the technical point (portal escapes the sticky stacking context), drop the CV vocabulary. Grep confirmed this is the ONLY `cv`/domain leak in `components/app/*`.

5. [x] **Test — `identity.ts` pure/impure helpers** (new `lib/data/identity.test.ts`). Mirror `settings.test.ts` mocking (`vi.mock("@/lib/supabase/server")`).
   - `initialsOf` (pure, no mock): `null → "?"`, single word → first two letters upper, two+ words → first+last initial, whitespace-only → `"?"`.
   - `getDisplayName` (mock `createClient().from().select().eq().maybeSingle()`): profile `display_name` wins; falls back to `meta.fullName`; falls back to email local-part (`ada@x.com → "ada"`); returns `null` when nothing. This pins the display-name chain AC2 relies on.

6. [x] **Test — AC2 sidebar threading (source-level)** (new `components/app/app-sidebar.test.ts`). Mirror `components/brand/logo.test.ts`: read `app-sidebar.tsx` as a string and assert the email is actually threaded and rendered, plus logout is present:
   - source destructures `email` from `useAppUser()`;
   - source contains a render of `{email` … `}` inside the badge (the email line exists, not just the type);
   - source still wires the logout control (`onClick={logout}` + `aria-label={t("logout")}`).
     Also add a companion assertion in the same file (or `app-shell.test.ts`) that `app-shell.tsx` source declares `email` on `AppUser`. State in a comment WHY source-level: the repo has no DOM test runner (vitest `environment: node`, no testing-library/jsdom) and the established convention for component assertions is source inspection (`logo.test.ts`) — a real render test would require a new dev dependency, which the interdicts forbid.

7. [x] **Test — AC3 tokens-only (honest, non-tautological)** (in `components/app/app-sidebar.test.ts`). Assert the email line added in task 3 introduces no raw colour: read `app-sidebar.tsx` and assert `/#[0-9a-fA-F]{3,6}\b|rgb\(|hsl\(/` does NOT match the file. State in a comment that the authoritative AC3 gate is the `check-design-tokens.mjs` prebuild (72 files green), which this test does not replace — the test is a fast local guard on the one file s04 edits, not a re-implementation of the build guard. Do NOT assert on the full shell (that would duplicate the build guard and rot); scope to the edited file.

8. [x] **Verify AC1 is still pinned — reference, do not duplicate.** No new AC1 test. In the review notes / test file header, point to `proxy.test.ts:57-77` (unauth `/fr/dashboard` and `/fr/settings/profile` → 307 `/login?redirect=`) as the AC1 pin. If the server re-guard (`dashboard/page.tsx:19-22`) is trivially assertable at source level without a DOM, a one-line source assertion (`redirect({ href: "/login" })` present when `!user`) MAY be added — optional, not required; skip if it forces mocking the RSC render.

9. [x] **i18n note (fr+en together, only if a label is added).** Rendering `user.email` needs NO new i18n key (an email is data, not UI copy). Do NOT invent an `appNav.email` label unless task 3 introduces a visible/aria text label — in which case add the SAME key to `messages/fr.json` AND `messages/en.json` `appNav` block (currently 8 keys, identical across locales) in one edit. Default: no i18n change.

## Run interdicts

- Do NOT touch `proxy.ts`, the `PROTECTED` list, or `scripts/check-design-tokens.mjs` — their diff must stay empty (reviewer: `git diff` those paths = nothing).
- Do NOT add a testing-library / jsdom / happy-dom dependency, or set a vitest DOM `environment`. No new npm dep of any kind. (Reviewer: `package.json` deps diff empty; `vitest.config.ts` unchanged.)
- The AC2 change is additive threading only: `AppUser` gains one optional field, the layout passes one more value, the sidebar renders one more line. NO new component, NO dropdown, NO shell restructure. (Reviewer: the diff is a handful of additive lines across exactly 3 source files.)
- Stay tokens-only: no raw hex/rgb/hsl, no arbitrary Tailwind value, no bare palette utility in the new email line — reuse existing `--color-*` tokens (`text-on-pine`). The prebuild guard fails the build otherwise.
- No hardcoded UI string. The email is data; if any label/aria text is added it goes through `appNav` in fr+en together.
- No migration, no RBAC/role work (that is s05), no 2FA. The `profiles`/service-role layer is untouched.
- Do NOT "modernise" `use-logout.ts`'s `window.location.assign("/login")` (deliberate hard-nav, see research trap) or swap sidebar `@/i18n/navigation` links for `next/link`.

## The point everything turns on

**AC2 "email affiché" is satisfied by threading `user.email` → `AppUser.email` → the expanded sidebar badge, and rendering it there only.** The three places this could be wrong:

1. **Where the email renders.** The plan puts it under the display-name in the _expanded_ badge (`app-sidebar.tsx:175-179`) and deliberately NOT in the collapsed rail (`:157-165`) or the mobile avatar-only state. Compare against research Open-Q 1: "inline under the name in the sidebar badge is the natural spot and matches 'user menu (email shown)'". If the reviewer reads AC2 as requiring the email visible in the collapsed state too, that is a design call — but the collapsed rail is an 8×8 avatar with no text room, so forcing it there would break the layout. The expanded badge is the honest reading of "user menu (email shown)".
2. **The env trap makes AC2 unobservable by live render, not the code.** `(app)/layout.tsx` calls `ensureProfile` → `createServiceRoleClient()`, which THROWS if `SUPABASE_SERVICE_ROLE_KEY` is absent (research trap). Any test that imports the layout must mock `ensureProfile`/`@/lib/supabase/service-role` (as `settings.test.ts` already does) or it 500s before AC2 can be seen. This plan sidesteps it entirely by testing at the sidebar/identity level (which never touches the service-role client), not the layout render — compare against `settings.test.ts:12-14`.
3. **The test altitude.** The repo has no DOM runner, so "sidebar renders the email" is asserted at source level (`logo.test.ts` precedent), not via a rendered DOM. This is a real limitation, stated openly: the tests prove the email is _threaded and written into the render path_ and that logout is wired, but not a pixel-level render. If the reviewer wants a true render assertion, that is a dependency decision outside s04's interdicts and should be its own story.

## Files touched

- `components/app/app-shell.tsx` — add `email?: string | null` to `AppUser` + context default (task 1).
- `app/[locale]/(app)/layout.tsx` — pass `email: user.email ?? null` into `<AppShell user>` (task 2).
- `components/app/app-sidebar.tsx` — destructure `email`, render the email line in the expanded badge (task 3).
- `components/app/mobile-sidebar.tsx` — neutralise the CV comment at line 14-16 (task 4).
- `lib/data/identity.test.ts` — NEW: `initialsOf` + `getDisplayName` tests (task 5).
- `components/app/app-sidebar.test.ts` — NEW: source-level AC2 threading + AC3 tokens-only assertions (tasks 6-7).
- (Conditional) `messages/fr.json` + `messages/en.json` — only if task 3/9 adds a label; default untouched.
- NOT touched: `proxy.ts`, `proxy.test.ts`, `scripts/check-design-tokens.mjs`, `lib/hooks/use-logout.ts`, `lib/data/ensure-profile.ts`, any migration.

## Test strategy

Unit altitude, pure-node vitest (no DOM), mirroring the two existing precedents:

- **Behavioural / logic** — `identity.test.ts` mocks `@/lib/supabase/server` (`settings.test.ts` style) to pin `getDisplayName`'s fallback chain and `initialsOf`'s pure logic. These underpin the badge's name+initials, which AC2's "user menu" depends on.
- **Source-level structural** — `app-sidebar.test.ts` reads the component source (`logo.test.ts` style) and asserts: (a) AC2 — `email` is destructured from context and rendered in the badge, logout control present; (b) AC3 — no raw colour token in the file s04 edits. Both carry a comment stating the authoritative source (build guard for AC3; the missing DOM runner for the render-altitude choice) so the tests are not passed off as more than they are.
- **AC1** — referenced, not duplicated: `proxy.test.ts:57-77` already pins the redirect. Optional one-line source pin of the `dashboard/page.tsx` re-guard, skipped if it forces RSC mocking.
- **Trap handling** — no test imports `(app)/layout.tsx`; the AC2 thread is verified at the sidebar/context/identity layer, so the `ensureProfile`/`SUPABASE_SERVICE_ROLE_KEY` throw is never triggered. If a future test does import the layout, it MUST `vi.mock("@/lib/data/ensure-profile")` and `vi.mock("@/lib/supabase/service-role")`.

## Definition of Done

- One commit on `feature/s04-app-shell` carrying research + this plan + the code.
- AC2: a logged-in user's email is threaded `layout → AppUser → sidebar badge` and rendered tokens-only in the expanded sidebar; logout still wired. New tests green.
- AC1 & AC3: unchanged and still green — `proxy.test.ts` passes; `check-design-tokens` prebuild passes (still zero raw colour in `components/app/*`, now including the email line).
- CV-domain comment removed from `mobile-sidebar.tsx`; `grep -riE 'cv|applyzi|resume' components/app/` returns nothing.
- `pnpm test` (vitest) green; `pnpm build` (with the token guard) green. No new dependency, no migration, no touched interdict file.
- Readable additive diff across 3 source files + 2 new test files; review passed with no open critical.
