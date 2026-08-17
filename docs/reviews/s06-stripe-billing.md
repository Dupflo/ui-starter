# Review — Story s06-stripe-billing

> Fresh-context anti-hallucination + SECURITY re-review of the FIX (reviewer subagent), read-only.
> Diff reviewed: `git diff main...feature/s06-stripe-billing` (branch at amended commit `3545442`).
> Suite run by the reviewer on Node 22 (`.nvmrc` → `nvm use` → v22.17.0).
> This report REPLACES the prior one: the prior MAJOR + 2 MINORs are re-verified as FIXED below.

## What was fixed (verification of the 3 findings)

### 1. MAJOR (now RESOLVED) — subscription.updated/deleted no longer write a null PK

- **Before**: both handlers did `upsert({ stripe_customer_id, …, status }, { onConflict:"user_id" })` with NO `user_id` supplied → null NOT-NULL PK on insert / no match on conflict, and the `.error` was swallowed (200 to Stripe). The downgrade path was dead.
- **After** (`route.ts:106-160`): both handlers now do `serviceRole.from("subscriptions").update({ status, stripe_subscription_id, updated_at }).eq("stripe_customer_id", <sub.customer>)`. No INSERT is attempted, so no null-PK violation is possible. `updated` writes the raw Stripe `subscription.status`; `deleted` writes `status:"canceled"`.
- **Linkage is real (verified)**: `stripe_customer_id` IS written to the `subscriptions` row on `checkout.session.completed` (`route.ts:87`, value `session.customer`). The `customer.subscription.*` events carry `.customer` = that same Stripe customer id. So `.update().eq("stripe_customer_id", …)` targets the exact row created at checkout and flips its status for the right user. Column exists in the migration (`0003_subscriptions.sql:9`, `stripe_customer_id text`) and in `database.types.ts:67/76/85`.
- **All subscription writes now check `.error` and return 500** on DB error (`checkout` upsert `route.ts:95-102`, `updated` `:124-131`, `deleted` `:151-158`) → Stripe retries, no swallowed 200. Confirmed by reading; no remaining unchecked write.
- **Idempotence + signature UNCHANGED and still first**: signature verify on the RAW body (`req.text()` + `constructEvent`) → 400 on missing secret/sig or throw, still before any DB op (`route.ts:19-31`). `stripe_events` insert → `23505` → early 200 replay short-circuit is still the FIRST DB op, other DB error → 500 (`route.ts:38-54`). Both untouched by the fix.
- **"Customer not found" edge (judged, acceptable)**: a Supabase `.update().eq(...)` matching zero rows returns `{ error: null }` (no error, zero rows affected) → the handler acknowledges 200. No 500 poison-loop, and no silent lie (there is no row to mis-state). Correct fail-quiet for an unknown customer; not a new hole.

### 2. MINOR (now RESOLVED) — tests bite the real contract

- `route.test.ts` now has separate mock chains: `subscriptions.upsert` (checkout) vs `subscriptions.update().eq()` (updated/deleted).
- `customer.subscription.deleted` test (`:197-222`): asserts `update` called with `status:"canceled"` + `stripe_subscription_id`, `.eq("stripe_customer_id","cus_123")`, and that `upsert` is NOT called. Plus a DB-error→500 case (`:225-236`).
- `customer.subscription.updated` test (`:239-259`): asserts `status:"past_due"` (raw mapping), `.eq("stripe_customer_id","cus_123")`, no upsert.
- **Bite proven**: I (a) flipped `deleted` status `"canceled"→"active"` and (b) retargeted `.eq` to `stripe_subscription_id` in `route.ts`, re-ran the file → 2 tests FAILED (status assertion + `.eq` assertion). Restored to committed state (git status clean). The replay bite from the prior review (23505 short-circuit) still holds — the REJEU test asserts `upsert` not called on the second identical `event.id`.

### 3. MINOR (now RESOLVED) — pricing header button has a real label

- `pricing/page.tsx` header `<Button href="/dashboard" size="sm" variant="subtle">` now renders `{t("dashboard")}` (was an empty comment).
- i18n parity: `pricing.dashboard` added to BOTH `messages/en.json` ("My dashboard") and `messages/fr.json` ("Mon tableau de bord"). Full `pricing` namespace parity confirmed; parity test green.

## Security path — still intact (re-verified)

- RLS: `subscriptions` = one `select using (auth.uid()=user_id)` policy, no insert/update/delete for `authenticated`; `stripe_events` RLS on, no policy. Migration unchanged by the fix.
- Only writers to both tables are `createServiceRoleClient()` in the webhook (grep: `route.ts:39/83/117/144`). `lib/data/subscription.ts:17` is `.select`-only. No anon write path. Forgery of `status='active'` closed.
- Signature verify + idempotence unchanged (see §1). Identity still derived from `metadata.user_id`/`client_reference_id`, never the client.

## Types / interdicts / no regression

- `typecheck` clean — no `as never` masking on the update payloads; the new `.update({...})` typechecks against `database.types.ts` honestly.
- `package.json`/lockfile diff EMPTY — no new npm dep.
- `proxy.ts` and `scripts/check-design-tokens.mjs` untouched (branch diff empty). `lint:design` green, tokens-only.
- No regression: webhook was the only file whose logic changed; the `active` (checkout) path is unchanged and still correct; dashboard gate / checkout action / config / data reader untouched by the fix.

## Gate (run by the reviewer, Node 22)

- `typecheck` — exit 0.
- `lint` — 0 errors, 4 warnings (all pre-existing in untouched `components/ui/modal.tsx`).
- `lint:design` — green, 83 files, 10 allowlisted, no arbitrary values.
- `test` — 82/82 across 15 files (was 79; +3 new webhook tests).
- `build` — green; `/pricing` (SSG) and `/api/webhooks/stripe` (dynamic) both present.
- Bite proven: broke deleted-status mapping + `.eq` target → 2 tests fail; restored (git clean).

## Not verified (no live Stripe/DB in this env)

- Live migration application, effective RLS rejection, and real `stripe listen` replay + hosted Checkout remain reasoned-from-reading, not exercised. The downgrade path is now DB-shaped correctly (`update().eq(stripe_customer_id)`), so the prior "DB-observable 23502 swallow" is gone; recommend the human still runs one live `customer.subscription.deleted` to confirm end-to-end.

## Findings

None open. The prior MAJOR (dead downgrade / null-PK / swallowed 500) and both MINORs (test safety-net, empty button) are fixed and verified.

## Verdict

Max severity: none
Ship allowed: yes
