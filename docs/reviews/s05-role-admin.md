# Review — Story s05-role-admin

> Fresh-context anti-hallucination + security review (reviewer subagent), read-only.
> Diff reviewed: `git diff main...feature/s05-role-admin` (branch at `79041b7`).
> Suite run by the reviewer on Node 22 (`.nvmrc` → `nvm use` → v22.17.0).

## Plan compliance

- [x] All 7 plan tasks done, nothing in the diff the plan didn't ask for. 8 files: 2 source (`app/[locale]/(app)/admin/page.tsx` new, `lib/data/identity.ts` edited), `database.types.ts`, `proxy.ts`, `supabase/migrations/0002_role.sql` (new), `messages/fr.json` + `messages/en.json`, `lib/data/identity.test.ts` (extended), + 2 pipeline docs (plan/research). No plan drift.
- [x] No ADR contradiction. ADR 003 mandates `profiles.role` `user`/`admin` default `user` — migration matches exactly. ADR 004 reserves the sensitive mutation (role) to the privileged path (service-role bypasses RLS); the app has no gate to write it. Using an RLS `WITH CHECK` on the existing update policy (rather than a new RPC) is defensible under ADR 004 here — no atomic multi-row logic, RLS is the baseline's own security language, and it fails closed.

## AC1 — `role` column + types (migration + hand-edited types)

- [x] `0002_role.sql`: `alter table public.profiles add column role text not null default 'user' check (role in ('user','admin'))`. Correct convention (`NNNN_slug.sql`, mirrors `0001_baseline.sql`).
- [x] `database.types.ts` ↔ migration agreement is EXACT: Row `role: "user" | "admin"` (non-null ↔ `not null`), Insert `role?: "user" | "admin"` (optional ↔ `default`), Update `role?: "user" | "admin"` (optional). Union literal mirrors the `CHECK`. No `Enums` block (text+CHECK choice, per plan). Hand-maintained — verified by eyeball since there is no `gen types` script in `package.json`.

## AC2/AC3 — server-side gate (the security crux)

- [x] `admin/page.tsx` reads the role SERVER-SIDE: `const user = await getUser()` (session-derived identity, never a client-supplied id) → `getRole(user.id)` → `if (!isAdmin(role)) notFound()`. Non-admin gets a 404 that doesn't reveal `/admin` exists. Unauth → `redirect({ href: "/login", locale })`. Pattern mirrors `dashboard/page.tsx` exactly; all imports verified to exist (`notFound` from `next/navigation`, `redirect` from `@/i18n/navigation`, `getUser` from `@/lib/supabase/server:35`, `AppHeader` from `components/app/app-header.tsx:13`, `getRole`/`isAdmin` from `lib/data/identity.ts`).
- [x] `getRole` fail-safes to `"user"`: `return (data?.role as ...) ?? "user"` — never admin-by-default when the row or `role` is absent/null. Mirrors `getAvatarUrl`.
- [x] `/admin` added to `proxy.ts` `PROTECTED` (auth layer). The ROLE gate is in the page, not the middleware — correct, the middleware cannot read the DB (rule "nothing between createServerClient and getUser"). Existing `PROTECTED` entries and redirect logic untouched (only `"/admin"` appended).
- [x] Build confirms `/admin` renders as `ƒ` (Dynamic, server-rendered on demand) — correct for a server-gated page.

## Self-promotion defence (the point everything turns on)

- [x] `0002_role.sql` drops and recreates `profiles_update_own` with `with check (auth.uid() = id and role = (select p.role from public.profiles p where p.id = profiles.id))`. Semantics reasoned through: in an UPDATE policy `WITH CHECK`, the unqualified `role` is the PROPOSED (new) value; the correlated subquery reads the CURRENT committed row for the same id, so the check requires proposed == stored, i.e. `role` is frozen. `display_name`/`avatar_url` stay freely writable. This is the standard RLS column-freeze pattern and is correct. Service-role bypasses RLS, so out-of-band admin promotion (SQL/dashboard) still works — as intended.
- [x] No app-side path writes `role`. `grep` over `app/ lib/ components/` confirms the only `profiles` writers are `settings.ts` (upsert `{id, display_name}` only — its on-conflict UPDATE leaves `role` unchanged → satisfies the WITH CHECK trivially) and `ensure-profile.ts` (service-role, `{id, display_name}`, `ignoreDuplicates` — role gets the DB default `'user'`, never overwritten). `settings.ts` is UNCHANGED by the diff. There is no promotion UI, action, or RPC. Self-promotion path: NONE.

## Anti-hallucination — tests verified against real sources

- `lib/data/identity.test.ts` (extended): `getRole` mocks the `from → select → eq → maybeSingle` chain (`settings.test.ts` style). Cases: `role:"admin"` → `"admin"`, `role:"user"` → `"user"`, `data:null` → `"user"` (fail-safe), `role:null` → `"user"` (fail-safe) — match `identity.ts` exactly. `isAdmin`: `"admin"` → true, `"user"` → false — matches the pure predicate. The gate decision is tested via `isAdmin` (honest altitude given the repo runs vitest `environment: node`, no DOM runner — consistent with `logo.test.ts`/`app-sidebar.test.ts` precedent).
- **Bite proven**: mutating `getRole`'s default from `?? "user"` to `?? "admin"` → the two fail-safe tests (absent-row, null-role) FAIL. The security-critical fail-safe is genuinely pinned. Restored clean.

## Rules compliance & interdicts

- [x] `package.json` / lockfile diff EMPTY — no new npm dep.
- [x] No RBAC/CASL, no `permissions`/`roles` table, no policy engine — a single `role text CHECK` column.
- [x] No promotion UI/action/RPC (out-of-band only). No 2FA/OTP.
- [x] i18n: `admin` namespace added to BOTH `fr.json` and `en.json` (`title`, `subtitle`); parity test (`messages.test.ts`) green. No hardcoded UI string in the page.
- [x] `scripts/check-design-tokens.mjs` and `lib/actions/settings.ts` untouched (diff empty). `/admin` UI is tokens-only (`text-ink-strong`, `text-muted`, `font-display`) — `lint:design` green.

## Tests (gate run by the reviewer)

- [x] `typecheck` — exit 0.
- [x] `lint` — 0 errors, 4 warnings (all pre-existing in untouched `components/ui/modal.tsx`).
- [x] `lint:design` — green, 75 files, 10 allowlisted, no arbitrary values.
- [x] `test` — 56/56 across 11 files (s05 adds 6 tests to `identity.test.ts`; prior 50 still green).
- [x] `build` — green; `/admin` present as a dynamic route + proxy middleware.
- [x] Bite proven (fail-safe default flip → 2 fails), restored.

## Regressions

- [x] No impact on existing paths. `identity.ts` additions are new exports only; `getDisplayName`/`getAvatarUrl`/`initialsOf` untouched. `proxy.ts` only appends `/admin`. `settings.ts` unchanged and still compatible with the new WITH CHECK.

## Findings

- **none** (ship-blocking).
- **minor** — `admin/page.tsx` passes `title={tNav("dashboard")}` to `AppHeader`, so the `/admin` top-bar reads "Dashboard" while the page body correctly shows `admin.title` ("Administration"). No `appNav.admin` label exists. It's an i18n key (not a hardcoded string) and not an AC violation, but the header label is cosmetically wrong for the admin screen. Trivial fix next cycle (add an `appNav.admin` key or reuse `admin.title`).

## Not verified

- **Live migration + real RLS rejection** — `0002_role.sql` cannot be applied in this environment (no live DB); it ships as a file for manual application on production. The SQL correctness (column definition + `WITH CHECK` freeze semantics) was reasoned through by reading, not exercised. Human: apply the migration on a real project and confirm (a) an authenticated user's attempt to `update profiles set role='admin' where id=auth.uid()` is rejected by RLS, and (b) a `display_name` update still succeeds.
- **Live gate render** — that a real admin session reaches `/admin` and a real user session gets a 404 is verified as threaded/logic-tested, not exercised in a browser.

## Verdict

Max severity: minor
Ship allowed: yes
