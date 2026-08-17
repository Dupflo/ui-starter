# Research — Story s06-stripe-billing

## The five structuring facts

1. **The scaffold is real but hollow — three stubs waiting on business logic.** The webhook already verifies the Stripe signature on the raw body but does nothing with the event (`app/api/webhooks/stripe/route.ts:23` `getStripe().webhooks.constructEvent(...)`, then `void event` at :29). The pricing page is a static placeholder with no Checkout call (`app/[locale]/pricing/page.tsx:9-13` "Placeholder neutre"). `getStripe()` exists and is server-only (`lib/stripe/client.ts:7-11`). So the plumbing (route, client, signature check) is in place; the entire s06 payload — Checkout creation, subscriptions table, webhook upsert, idempotence, gate — is unbuilt.

2. **The `subscriptions` table does NOT exist yet — it needs a new migration `0003_subscriptions.sql`.** Only two migrations exist: `0001_baseline.sql` (profiles) and `0002_role.sql` (role column). Neither creates `subscriptions`; `database.types.ts:16-49` types only `profiles`. ADR 003 (`docs/decisions/003-data-billing-baseline.md:13`) and `docs/architecture.md:49` both _spec_ the table (`user_id`, `stripe_customer_id`, `status`, `plan`) but leave it for s06. A new migration + a regenerated `database.types.ts` entry are mandatory for AC2/AC3.

3. **The architecture doc has already frozen the whole s06 design — follow it, don't reinvent it.** `docs/architecture.md:55` prescribes: `lib/stripe/client.ts` (`getStripe()`), a price-ID catalogue from env, a **server action checkout → hosted Checkout URL**, the webhook `constructEvent` on raw body, **idempotent on `session.id`**, writing via the **service-role client**, with the **Checkout `metadata` as the webhook's source of truth**. This is the target shape; the plan should not deviate without an ADR.

4. **The write pattern for the webhook already exists in `ensureProfile` — service-role + idempotent upsert on a stable key.** `lib/data/ensure-profile.ts:20-26` uses `createServiceRoleClient()` (RLS bypass, `lib/supabase/service-role.ts:9`) and `upsert(..., { onConflict: "id" })`. The webhook must do the same: service-role write (a user must never be able to forge `status=active` via RLS), keyed upsert. `createServiceRoleClient` is server-only and typed `<Database>`.

5. **The gate (AC4) has a direct precedent to mirror: `getRole` + `isAdmin` + a page-level gate.** `lib/data/identity.ts:55-73` reads a column server-side with a fail-safe default and exposes a pure predicate; `app/[locale]/(app)/admin/page.tsx:27-30` gates on it (`if (!isAdmin(role)) notFound()`). AC4 wants the identical shape: a `getSubscription`/`isActive` reader in `lib/data/*` + a page/section gate.

## Target story

Souscription Stripe de bout en bout. Acceptance criteria (`docs/stories.md:127-131`):

1. Pricing page offers 1–2 plans; click opens Stripe Checkout.
2. A successful payment creates/updates a subscription record linked to the user.
3. The webhook updates status (`active`/`canceled`) **with signature verification AND idempotence** (replaying an event duplicates nothing).
4. A gated element is visible only to an `active` subscriber.

Scope guards (`docs/stories.md:139-141`): subscriptions only (no one-time payment); graveyard = guest checkout, complex multi-plan. Depends on s04 (merged — auth/user present).

## Current state of the code

- **`lib/stripe/client.ts`** (12 lines) — `getStripe()` reads `STRIPE_SECRET_KEY`, throws `STRIPE_KEY_MISSING` if absent, returns `new Stripe(key)`. `import "server-only"`. Complete, reusable as-is.
- **`app/api/webhooks/stripe/route.ts`** (32 lines) — `POST` handler, explicitly labelled "STUB baseline". Reads `STRIPE_WEBHOOK_SECRET` + `stripe-signature` header (400 if either missing), reads the **raw body** via `req.text()` (:20), calls `constructEvent` (:23), returns 400 on invalid signature, then `void event` (:29) and `{ received: true }`. Signature verification is DONE; event handling, idempotence, and DB writes are NOT.
- **`app/[locale]/pricing/page.tsx`** (44 lines) — static RSC placeholder. Renders logo, a `Button href="/dashboard"`, a title/subtitle from the `home` i18n namespace. **No plan list, no price IDs, no Checkout session creation.** Everything AC1 needs is missing.
- **Migrations** — `0001_baseline.sql` (profiles + RLS: select/insert/update own), `0002_role.sql` (adds `role` + hardens `profiles_update_own` so a user can't self-promote). No `subscriptions`.
- **`database.types.ts`** — hand-maintained (ADR 003:24), types only `profiles` incl. `role: "user" | "admin"`. A `subscriptions` entry must be added by hand.
- **No `lib/actions/checkout.ts`, no `lib/data/subscription.ts`.** `lib/actions/` holds password-reset, settings, sign-out; `lib/data/` holds dashboard, ensure-profile, identity.

## Anchor points

- **New migration**: `supabase/migrations/0003_subscriptions.sql` (next number after `0002_role.sql`).
- **New types**: add `subscriptions` Row/Insert/Update to `database.types.ts:48` (inside `public.Tables`, after `profiles`).
- **Checkout action**: `lib/actions/checkout.ts` (`"use server"`), invoked from a client component on the pricing page. Returns `{ ok:false, error } | { ok:true, url }` per the error convention (`lib/actions/settings.ts:15`).
- **Webhook logic**: fill in `app/api/webhooks/stripe/route.ts:28-29` (replace `void event`) — switch on `event.type`, dedupe, upsert via service-role.
- **Subscription reader**: `lib/data/subscription.ts` — `getSubscription(userId)` / `isActiveSubscriber(...)`, mirroring `lib/data/identity.ts:55-73`.
- **Gate + pricing UI**: the gated element on `app/[locale]/(app)/dashboard/page.tsx:24` (session already resolved there, `user.id` in hand) or a dedicated section; pricing rebuilt in `app/[locale]/pricing/page.tsx`. Client "Subscribe" button calls the checkout action.
- **i18n**: new `pricing` (and gate) namespace in `messages/en.json` + `messages/fr.json` (top-level keys today stop at `admin`, `messages/en.json:125`). No hard-coded UI strings.
- **Env**: `.env.local.example` (Stripe block at :8-12) needs price-ID vars added.
- **proxy.ts**: no change — `/api/webhooks/stripe` is non-locale and excluded from the matcher (`docs/architecture.md:21`); `/pricing` is public (not in `PROTECTED = ["/dashboard","/settings","/admin"]`, `proxy.ts:10`).

## Verified APIs / functions

- `getStripe(): Stripe` — `lib/stripe/client.ts:7`. Throws if `STRIPE_SECRET_KEY` missing. Server-only.
- `stripe.webhooks.constructEvent(raw, sig, secret)` — already called at `app/api/webhooks/stripe/route.ts:23`. Requires the **raw** body (`req.text()`, :20) — never `req.json()`.
- `stripe.checkout.sessions.create(...)` — to add (not yet used anywhere). `mode: 'subscription'`, `line_items: [{ price, quantity: 1 }]`, `success_url`/`cancel_url`, and user linkage.
- `createServiceRoleClient()` — `lib/supabase/service-role.ts:9`. Typed `<Database>`, RLS bypass, server-only. The webhook's writer.
- `createClient()` / `getUser()` — `lib/supabase/server.ts:8,35`. RLS-scoped reads; `getUser()` derives identity (never a `userId` arg — AGENTS.md law).
- Upsert idempotence precedent — `lib/data/ensure-profile.ts:23` `upsert(..., { onConflict: "id", ignoreDuplicates: true })`.
- Gate precedent — `getRole`/`isAdmin` (`lib/data/identity.ts:55,71`) + `notFound()` gate (`admin/page.tsx:28`).
- Error convention — `type ProfileResult = { ok:true } | { ok:false; error:string }` (`lib/actions/settings.ts:15`); report via `reportError(err, ctx)` (`lib/observability.ts`, has a `service?: "stripe"` field and a `route` example `"/api/webhooks/stripe"`).
- Stripe version: `stripe@^22.3.0` (`package.json`), `next-intl@^4`, `react-hook-form@^7`, Vitest 4.

## Idempotence — the crux (THE hard decision)

Replayed events (Stripe retries on non-2xx, and `stripe listen` replays) must not duplicate or corrupt state. Two mechanisms:

- **A. Insert-once `stripe_events` table keyed by Stripe `event.id`** (Stripe event ids are globally unique). At the top of the handler: `insert({ id: event.id })` with the PK as the guard — on unique-violation, the event was already processed → return 200 without re-applying. This dedupes **every** event type generically and gives an audit trail. Cost: a second table + migration.
- **B. Idempotent upsert on a natural subscription key.** Upsert `subscriptions` on `onConflict: "user_id"` (or `stripe_customer_id`). Replaying "subscription active" just re-writes the same row → no duplicate. This is what `ensureProfile` does and it's simpler (no extra table), but it only protects the subscription row; it doesn't dedupe side effects and isn't a general guard.

**Recommendation: B as the baseline, made robust by design, with A available if audit/multi-event-type dedup is wanted.** The story's AC3 ("rejouer l'event ne duplique rien") is satisfied by an idempotent upsert keyed on `user_id` (one subscription per user in this baseline) — the row is overwritten, not appended, so a replay is a no-op. This matches the `ensureProfile` pattern already in the codebase and keeps the migration to a single table. **However**, `docs/architecture.md:55` explicitly says **"idempotent sur `session.id`"** — reading it as: the webhook keys dedup off the Checkout session (whose `metadata`/`client_reference_id` carries `user_id`), and the upsert is keyed so re-processing the same session is inert. The plan must reconcile "idempotent on session.id" (arch) with the upsert key: simplest coherent reading is upsert `subscriptions` on `stripe_customer_id`/`user_id`, which is stable across replays of the same session. A dedicated `stripe_events` table (option A) is the belt-and-suspenders upgrade if AC3 is read strictly as "the same _event_ must be provably processed once" — flag this as the open question for /ks-plan.

## User linkage — how the webhook finds the user

`docs/architecture.md:55` is explicit: **the Checkout `metadata` is the webhook's source of truth.** The checkout action (running as the logged-in user via `getUser()`) sets `metadata.user_id` (and/or `client_reference_id`) on the session; on `checkout.session.completed`, the webhook reads `session.metadata.user_id` (or `client_reference_id`) → writes `subscriptions.user_id`, capturing `stripe_customer_id` for later `customer.subscription.*` events. No email lookup, no reverse mapping needed at first payment. Follow-up events (`customer.subscription.updated/deleted`) key off `stripe_customer_id` stored on that first write.

## Traps & constraints

- **No live Stripe/DB in this env.** Migration `0003` and the handler ship as _files_; they are not applied here (cf. `0002_role.sql:2` "Applied manually on production — not executed in this environment"). Local end-to-end (`stripe listen` → real Checkout) is a **human/manual** step → "Not verified" in the review.
- **RLS forgery guard (security-critical).** The `subscriptions` RLS must let a user **read own** (`user_id = auth.uid()`) but **never write** — only the service-role writer sets `status`. Mirror the s05 hardening intent (`0002_role.sql:11-34`): if a user could upsert their own subscription row, they'd forge `status='active'` and defeat AC4. No insert/update policy for the `authenticated` role.
- **Raw body only.** Do not switch the webhook to `req.json()` — `constructEvent` needs the exact raw bytes (`route.ts:20`). Preserve the existing App-Router route (Next 16 handlers get the raw body via `req.text()`).
- **Design tokens gate.** `prebuild` runs `scripts/check-design-tokens.mjs` (`package.json:10`) — the pricing UI must use only `@theme` tokens and compose `components/ui/*` primitives (Button/Container/Title/Text already imported in the placeholder). No arbitrary color/radius. Any missing primitive = a design-system gap to report, not to freestyle.
- **i18n law.** fr + en updated together; navigation via `@/i18n/navigation` (the placeholder already uses `Link` from there); no hard-coded UI strings. Pricing plan _labels_ are i18n; price _IDs_ are env.
- **Types are hand-written.** `database.types.ts` is maintained by hand (ADR 003:24) — the `subscriptions` type must be added manually and kept in exact sync with `0003_subscriptions.sql`, or the typed clients will lie.
- **Testability.** The webhook is unit-testable without Stripe by mocking `@/lib/stripe/client` (`getStripe().webhooks.constructEvent` returns a canned `event`) and `@/lib/supabase/service-role` (spy on `upsert`) — the exact mock shape used in `lib/actions/settings.test.ts:8-14`. Cover: (a) invalid signature → 400, (b) `checkout.session.completed` → upsert `active`, (c) `customer.subscription.deleted` → `canceled`, (d) **replayed event → single row / no duplicate** (idempotence), (e) status mapping. Env-var-missing branches (400) are already testable against the existing stub.
- **`ensureProfile` FK dependency.** `subscriptions.user_id` → `auth.users(id)` (or `profiles.id`); a subscription can only be written for a provisioned user — already guaranteed by `ensureProfile` on entry.

## Open questions

1. **Idempotence store: upsert-key only (option B) vs. dedicated `stripe_events` table (option A)?** Arch says "idempotent sur `session.id`" — resolve whether that mandates a second table or is satisfied by a keyed upsert. Recommend deciding at /ks-plan (my lean: B, one migration; A only if a stricter reading of AC3 wins). _Possibly an ADR if a `stripe_events` table is introduced._
2. **Upsert conflict key**: `user_id` (one sub per user, simplest) vs `stripe_customer_id`. One-sub-per-user matches the neutral baseline and AC4.
3. **`subscriptions.status` domain**: `active`/`canceled` per AC3, but Stripe emits `trialing`/`past_due`/`incomplete` etc. — store the raw Stripe status (text, not enum, matching the `role` choice at `0002_role.sql:6-8`) and let `isActiveSubscriber` map, or constrain to two values? Recommend: store raw text, gate on `status === 'active'` (extensible, no lost information).
4. **Plan → price-ID mapping shape**: a typed config (`lib/stripe/plans.ts`?) reading `STRIPE_PRICE_*` env vars, shared with s07 landing (`docs/stories.md:162` says s07 reads the same source). Where it lives and its exact env-var names are for /ks-plan.
5. **Which gated element** demonstrates AC4 — a dashboard section behind `isActiveSubscriber`, or a dedicated route? Dashboard section is the lightest proof.
6. **Publishable key**: this flow uses **hosted** Checkout (server action returns a redirect URL, `architecture.md:55`), so `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is **not** required (no client-side `stripe.js`). Confirm no client redirect via stripe-js is wanted; if hosted-URL redirect, publishable key stays out of `.env.local.example`.

## Real complexity

**Confirmed 4.** Not inflated by scaffolding: the signature-verification plumbing being pre-built (`route.ts:23`) removes one risk, but the four genuinely hard, interlocking pieces remain and all ship together — (1) a **new migration + hand-written types** with security-critical RLS (a wrong policy = forgeable `active` status), (2) the **idempotence design decision** (the crux, still open, possibly an ADR), (3) **webhook event handling + user linkage via metadata** across multiple Stripe event types, (4) a **checkout action + rebuilt pricing UI + gate** spanning action/data/UI/i18n/env layers. The scaffold is _slightly more complete than a blank slate_ (route, client, signature check, env vars, and a fully-specified target in `architecture.md:55` all pre-exist), which de-risks the plumbing but not the core reliability/security work. The manual-only end-to-end verification (`stripe listen`, no live Stripe here) adds review friction that keeps it at 4, not 3.

## Split proposal

Not required (verdict 4, not 5) and **not recommended** — the story is meant to ship as one, and the ACs are tightly coupled: the webhook (AC3) is worthless without the subscriptions table + Checkout that feed it (AC1/AC2), and the gate (AC4) is worthless without a real `active` row to read. Splitting would strand half-features behind unmergeable seams. If the branch grows unwieldy, the only clean seam is a **separately-revertable migration commit** (`0003_subscriptions.sql` + its `database.types.ts` change) landing first, per AGENTS.md's "second commit only for something you'd want to revert on its own (typically a migration)" — same commit-splitting used for s05's `0002_role.sql`.
