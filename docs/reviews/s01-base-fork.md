# Review — Story s01-base-fork

> Fresh-context review (reviewer subagent), 3rd pass — re-review after the logo fix run. Each issue classified: critical / major / minor.
> Diff reviewed: `git diff main...feature/s01-base-fork` (branch at `a67d1ce`).
> Suite run by the reviewer on Node 22.17.0 (`nvm use`, `.nvmrc` pins 22).

## What this pass verifies

The prior pass (`26bef63`) closed `major` / `Ship allowed: yes`, with one remaining **major**: `components/brand/logo.tsx` rendered a hardcoded "Applyzi" wordmark + `aria-label="Applyzi"` on delivered screens. A fix was amended into the story commit (`26bef63` → `a67d1ce`). This pass confirms that finding is RESOLVED and the fix introduced no regression or new issue. The two prior minors (killed-domain refs in code comments; pre-existing flagship lint warnings) remain accepted minors.

## Fix run — isolated (`git diff 26bef63 a67d1ce`, code only)

Exactly 3 non-doc files, scoped and non-breaking:

- `components/brand/logo.tsx` (8 lines): comment, `aria-label`, wordmark all `Applyzi` → `UI Starter`. Confirmed in the committed tree: aria-label = `UI Starter`, wordmark renders `UI <span>Starter</span>`, no "Applyzi" in any form (contiguous or split across JSX).
- `components/brand/logo.test.ts` (new, +36): source-level guard mirroring `messages/legal.test.ts`.
- `.gitignore` (+`*.tsbuildinfo`): matches the untracked `tsconfig.tsbuildinfo` in the working tree — correct collateral, no artifact leaked into the tree.

## Prior major — RESOLVED (verified independently)

- **RESOLVED (was major)** — `components/brand/logo.tsx`. The original flagship defect was two occurrences: `aria-label="Applyzi"` (contiguous) and `Apply<span…>zi</span>` (wordmark split across elements). Both are neutralized to "UI Starter". `Logo` is rendered on 5 delivered screens (`(legal)/layout`, `pricing`, `app-sidebar`, `settings-form`, `auth-shell`); all now carry the neutral name. A full sweep for rendered "Applyzi" across `app/ components/ messages/ lib/ i18n/` (excluding comments/tests) is empty. Message catalogs `messages/{fr,en}.json` carry no `applyzi|anywwwhere|crédits de bienvenue`.

## Guard test — bites, with one documented blind spot

- Bite proven: injecting `aria-label="Applyzi"` → 2 of 3 assertions red (no-Applyzi + aria-label); restored `git diff --exit-code` clean.
- **Blind spot (minor, see Findings)**: the no-brand assertion is `/applyzi/i` over raw source, so a wordmark _split across JSX_ (`Apply`+`<span>zi</span>` — the exact shape flagship used) does NOT match. Injecting that split form leaves all 3 assertions green. The other two assertions (`aria-label="UI Starter"`, source contains "UI Starter") are also insensitive to it. For THIS story the defect is resolved in source regardless; the gap is future-regression robustness, not a shipped defect.

## Gate — run by the reviewer

- `typecheck` — clean (exit 0).
- `lint` — 0 errors, 4 warnings (`react-hooks/set-state-in-effect` in untouched `cookie-banner.tsx`/`modal.tsx`, inherited from flagship — pre-existing accepted minor).
- `lint:design` — green: no arbitrary values in **70** files (was 69; +1 = the new `logo.test.ts`). Token guard `scripts/check-design-tokens.mjs` unchanged.
- `test` — **16/16** passing, 5 files (was 13/3; +3 = `logo.test.ts`).
- `build` — green. Route map clean: fr/en pairs, legal (4), auth, dashboard, settings, pricing, api stubs. No CV/adapt/mcp/oauth routes.

## Regressions

- [x] No impact on kept code paths. The fix touches only `logo.tsx` (rendered strings, same structure/variants/tokens preserved) and adds a test. Typecheck/build/lint all green; the other 101 files are byte-identical to the prior accepted pass.

## Anti-hallucination (re-confirmed, not re-derived)

- [x] No invented import/API in the fix: `logo.test.ts` uses `node:fs`/`node:url`/`node:path` + `vitest` (`describe/it/expect`), reads `logo.tsx` relative to `import.meta.url`. `logo.tsx` imports only `@/lib/cn` (exists). No new dependency.

## Findings

### Prior major

- **RESOLVED (was major)** — hardcoded Applyzi branding in `logo.tsx`: neutralized to "UI Starter" in wordmark + aria-label + comment; no rendered "Applyzi" on any delivered screen.

### Remaining minors (unchanged severity)

- **minor** — the `logo.test.ts` no-brand guard (`/applyzi/i` over source) does not catch a wordmark split across JSX elements (the flagship shape). Consider asserting on the _rendered_ string (e.g. render the component and query the accessible name / textContent) instead of raw source. Not a shipped defect — current source is clean.
- **minor** — stale killed-domain references in non-user-visible code comments / assets: `app/globals.css:7,253`, `components/cookie-banner.tsx:9`, `public/favicon.svg:3` (XML comment, not rendered), `scripts/backup-prod.sh` (comments), plus the previously-listed `mobile-sidebar.tsx`/`section-label.tsx`/`use-logout.ts`. Cleanup, not a defect.
- **minor** — 4 pre-existing `react-hooks/set-state-in-effect` lint warnings (`modal.tsx`, `cookie-banner.tsx`) inherited from flagship; not introduced by this story.

## Not verified (unchanged from prior pass — human/runtime)

- Supabase runtime / RLS (`0001_baseline.sql` read, not applied); Stripe webhook signature stub; auth/email flows; live browser rendering of the neutral shells. All out of scope for a strip-and-neutralize story; deferred to their owning stories (s03/s05/s06) and manual QA.

## Verdict

Max severity: minor
Ship allowed: yes
