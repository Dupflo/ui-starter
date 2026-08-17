# Review — Story s03-auth

> Fresh-context anti-hallucination review (reviewer subagent), read-only.
> Diff reviewed: `git diff main...feature/s03-auth` (branch at `c12f4ba`).
> Suite run by the reviewer on Node 22 (`.nvmrc`, `nvm use`).

## Plan compliance

- [x] All 6 plan tasks done; nothing in the diff the plan didn't ask for. No plan drift, no ADR contradiction.
- [x] Diff scope: 6 files, +509/-0 — only the 4 new `*.test.ts` files + pipeline docs (`plans/`, `research/`). `git diff --name-only` confirms NO production source changed: `proxy.ts`, `components/auth/*`, `lib/actions/sign-out.ts`, `lib/supabase/*`, `messages/*.json`, `scripts/check-design-tokens.mjs` all untouched.
- [x] Interdicts respected: no `package.json` change (no npm dep), no OTP/2FA, Google button + forms untouched, every `window.location.assign` unaffected. Task-5 neutralisation found nothing (matches research).

## Anti-hallucination — tests verified against real sources (not tautologies)

- `components/auth/schemas.test.ts` — asserts the actual i18n KEYS (`authErrorRequired`/`authErrorEmail`/`authErrorPassword`), matching `schemas.ts:6-17` exactly (`min(1)`/`.email()`/`min(8)`). Invalid inputs genuinely fail; per-field `.find(i => i.path[0]===...)` is robust.
- `lib/actions/sign-out.test.ts` — bite is real: asserts `signOut({ scope: "local" })` (matches `sign-out.ts:21`) AND `resolves.toBeUndefined()` when the mock rejects — only holds because of the try/catch at `sign-out.ts:20-25`.
- `proxy.test.ts` — drives the REAL exported `proxy()` (not a re-implemented predicate), mocking `@supabase/ssr` + `next-intl/middleware`. Proven to bite: mutating `PROTECTED` to `[]` flipped 2 assertions (`expected 200 to be 307`), then restored clean. Redirect targets (unauth→`/fr/login?redirect=<encoded>`, authed-on-login/signup→`/fr/dashboard`, public pass-through) match `proxy.ts:47-66`. No copied-constant drift.
- `messages/auth.test.ts` — real fr/en parity + key-presence + FORBIDDEN regex; all 24 asserted keys exist in both locales (25 each); regex catches "Applyzi".

## Rules compliance

- [x] Repo conventions (AGENTS.md): tests colocated, `@/` alias, i18n keys, no hardcoded UI strings introduced.
- [x] No accepted ADR contradicted. No migration (baseline already covers `profiles`).
- [x] AC1 confirm-email contract: `signup-form.tsx:44-70` has both the `!data.session → authErrorConfirmEmail` branch and the session→nav branch. No false "session always returned" assertion anywhere — the unit altitude (schemas + action + proxy + i18n) is a documented, justified scoping decision at complexity 2.

## Tests

- [x] Suite run by the reviewer, passing — `typecheck` exit 0 · `lint` 0 errors (4 pre-existing warnings in untouched `modal.tsx`) · `lint:design` green (72 files, 8 allowlisted) · `test` 36/36 across 9 files (the 4 new files add 20) · `build` green (27 pages).
- [x] Bite proven independently (proxy `PROTECTED` neutralization → 2 failures, restored).

## Regressions

- [x] No impact on existing paths — the prior 16 tests still green; no production code touched.

## Findings

- **none** (ship-blocking).
- **informational** — `components/auth/signup-form.tsx:68` carries a stale comment referencing "les crédits d'inscription / 0 crédits" (credit-ledger is graveyard). Pre-existing on `main`, a comment not code, outside this test-only story's scope. Worth a cleanup in a future story.

## Not verified

- **Live Supabase auth** — signup/login/logout exercised at unit altitude only. Human: walk signup → confirm-email (if ON) → login → logout against a real project; confirm session persistence across reload.
- **Google OAuth** — functional but out of scope, deliberately untested.

## Verdict

Max severity: none
Ship allowed: yes
