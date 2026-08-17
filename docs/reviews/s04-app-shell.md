# Review — Story s04-app-shell

> Fresh-context anti-hallucination review (reviewer subagent), read-only.
> Diff reviewed: `git diff main...feature/s04-app-shell` (branch at `e97b2f8`).
> Suite run by the reviewer on Node 22 (`.nvmrc`, `nvm use` → v22.17.0).

## Plan compliance

- [x] All 9 plan tasks done; nothing in the diff the plan didn't ask for. No plan drift, no ADR contradiction.
- [x] Diff scope: 8 files (+383/-6) — exactly 3 source files (`app-shell.tsx`, `(app)/layout.tsx`, `app-sidebar.tsx`) + 1 comment cleanup (`mobile-sidebar.tsx`) + 2 new test files + 2 pipeline docs (`plans/`, `research/`). Additive threading only: `AppUser` gains one optional `email` field, layout passes one value, sidebar renders one line. NO new component, NO dropdown, NO shell restructure.
- [x] Minor improvement over the plan text: the layout uses `user?.email ?? null` (optional chaining) where the plan wrote `user.email ?? null`. Safer, same result — not drift.

## AC2 — the one real deliverable ("email affiché")

- [x] `app-shell.tsx:22-23,29` — `AppUser` type declares `email?: string | null`; the `UserContext` default gains `email: null`. Single source of the thread.
- [x] `(app)/layout.tsx:52` — `<AppShell user={{ …, email: user?.email ?? null }}>`. Reuses the already-read `user` (line 40 for `getDisplayName`); no new `getUser`/DB call.
- [x] `app-sidebar.tsx:65,179-181` — destructures `email` from `useAppUser()` and RENDERS it (not just types it): `{email ? <p className="truncate text-xs text-on-pine">{email}</p> : null}`, in the EXPANDED badge's name block under the `displayName`. The collapsed rail (`:157-165`, 8×8 avatar) and mobile avatar-only state are correctly left email-free — the honest reading of "user menu (email shown)". Logout still wired (`onClick={logout}` + `aria-label={t("logout")}`, `:185-189`), unaffected.

## AC3 — tokens-only

- [x] The new email line uses `text-on-pine` (a real theme token: `--color-on-pine` in `app/globals.css:43`, already used on the adjacent logout button) + `truncate`. No raw hex/rgb/hsl, no arbitrary Tailwind value.
- [x] `check-design-tokens.mjs` prebuild green — 74 files, no arbitrary values (10 allowlisted). AC3 authoritative gate holds with the new line in scope.

## Anti-hallucination — tests verified against real sources (not tautologies)

- `lib/data/identity.test.ts` — SUT `identity.ts` is UNTOUCHED by the diff; the test pins its real existing logic. `initialsOf`: `null/""/"   " → "?"`, `"Ada" → "AD"` (`slice(0,2).toUpperCase()`), `"Ada Lovelace" → "AL"`, `"Jean Claude Durand" → "JD"` (first + last word initial) — all match `identity.ts:52-58` exactly. `getDisplayName`: profile `display_name` → `meta.fullName` → email local-part (`ada@example.com → "ada"`) → `null`, matches `identity.ts:23-30`; Supabase mocked `settings.test.ts`-style (`vi.mock("@/lib/supabase/server")`). **Bite proven**: mutating the last-word initial to first-word (`AL→AA`, `JD→JJ`) → 1 failure; restored clean.
- `components/app/app-sidebar.test.ts` — source-level structural assertions (`logo.test.ts` precedent, documented in-file: repo is vitest `environment: node`, no jsdom, a DOM runner is a forbidden new dep). Pins: `email` destructured from `useAppUser()`, `{email ?` render present in the badge, `onClick={logout}` + `aria-label={t("logout")}` still wired, `AppUser` type declares `email`, and no raw colour in the edited file. **Bite proven**: removing the email `<p>` render line → the `{email ?` assertion fails; restored clean. The AC3 no-raw-colour assertion is honestly scoped to the one edited file and states the prebuild guard is the authoritative gate.

## Rules compliance & interdicts

- [x] `package.json` deps and `vitest.config.ts` diff EMPTY — no new npm dep, no DOM `environment` change.
- [x] `proxy.ts`, `PROTECTED`, `scripts/check-design-tokens.mjs`, `lib/hooks/use-logout.ts` untouched — diff empty. `window.location.assign("/login")` kept (`use-logout.ts:41`). Sidebar links stay on `@/i18n/navigation`.
- [x] No migration, no RBAC/role, no 2FA; `profiles`/service-role layer untouched.
- [x] i18n: no new label added (email is data), so no `messages/*.json` change — correct per plan task 9.
- [x] CV-domain comment in `mobile-sidebar.tsx:14-16` neutralised — "cartes CV / badges / boutons « Éditer / Télécharger »" replaced with "Un contenu de page en `z-20`"; the stacking-context/portal technical point is preserved. `grep -riE 'cv|applyzi|resume|éditer|télécharger' components/app/` returns NOTHING.

## AC1 — not duplicated, still green

- [x] `proxy.test.ts:57-73` still pins unauth on PROTECTED `/fr/dashboard` and `/fr/settings/profile` → 307 `/fr/login?redirect=`. s04 adds no AC1 test and does not touch the guard. Suite green.

## Tests (gate run by the reviewer)

- [x] `typecheck` — exit 0.
- [x] `lint` — 0 errors, 4 warnings (all pre-existing in untouched `components/ui/modal.tsx`).
- [x] `lint:design` — green, 74 files (was 72 at s03; +2 new test files), 10 allowlisted.
- [x] `test` — 50/50 across 11 files (s04 adds 14 tests across 2 new files; prior 36 still green).
- [x] `build` — green (all pages + proxy middleware).
- [x] Bite proven independently twice (email render removal → 1 fail; `initialsOf` logic break → 1 fail), both restored.

## Regressions

- [x] No impact on existing paths — the `AppUser` field is optional with a null default, the render is null-guarded; prior 36 tests still green; no interdict file touched.

## Findings

- **none** (ship-blocking).
- **minor / informational** — `app-sidebar.test.ts` and part of `identity.test.ts` assert at source/logic altitude, not a rendered DOM. This is the openly-stated, repo-consistent limitation (`logo.test.ts` precedent; no DOM runner without a forbidden new dep): a source-regex test would not catch a semantic break in the email render, only its removal. Acceptable at complexity 2 and within the s04 interdicts; a true render assertion is a dependency decision for a future story.

## Not verified

- **Live render** — the email badge is verified as threaded and written into the render path, not exercised in a real browser. Human: log in and confirm the email shows under the display name in the expanded sidebar, and that the layout does not 500 (the `ensureProfile` → service-role throw requires `SUPABASE_SERVICE_ROLE_KEY` set — an env concern, not a code defect).

## Verdict

Max severity: none
Ship allowed: yes
