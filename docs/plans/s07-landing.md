---
validated: yes
---

# Plan — Story s07-landing

Branch: `feature/s07-landing`
Research: `docs/research/s07-landing.md` — read it first; this plan does not repeat it.

## Target story

**s07-landing** — Landing scaffold (`docs/stories.md:145`). A minimal public home page: hero + pricing section + closing CTA. NOT a full marketing sales landing (graveyard). Complexity 2. Deps s02 (tokens) + s06 (billing) both merged on the branch.

Acceptance criteria (`docs/stories.md:151-155`):

- **AC1** — Renders a hero, a pricing section (the **same plans as the Stripe config**), and a CTA.
- **AC2** — The pricing CTA routes to signup/checkout.
- **AC3** — Uses design tokens + is responsive.
- **AC4** — Texts go through i18n keys (fr/en ready).

The plan stands on one decision established in research: **anti-divergence by shared render, not by copy**. `/` and `/pricing` must render the plan card from ONE component that reads ONE `PLANS`. So the first task extracts the card; the landing then composes it.

## Tasks (ordered)

1. [x] **Extract the shared plan card into `components/pricing/plan-card.tsx`** (new file, server component). Factor the inline card currently at `app/[locale]/pricing/page.tsx:53-76` (`<Card pad="lg" className="w-full max-w-sm">` + name `Title h2` + price `Text` + optional features `Text` + `SubscribeButton`) into `PlanCard`. Props: the `Plan` entry (`plan`) + the pre-bound translations it needs — pass either the `pricing` translator `t` or the resolved strings (`subscribeLabel`, `pendingLabel`, `loginMessage`). Keep the exact same classes, structure, and `SubscribeButton` props (`priceId`, `loginHref="/login"`). The component reads `plan.nameKey` / `plan.priceLabelKey` / `plan.featuresKey` exactly as today. No behaviour change.

2. [x] **Rewire `app/[locale]/pricing/page.tsx` to use `PlanCard`.** Replace the inline `PLANS.map(...)` card body with `PLANS.map((plan) => <PlanCard key={plan.id} plan={plan} ... />)`. Rendered output MUST stay byte-equivalent (same wrapper `<div className="mt-12 flex flex-wrap gap-6">`, same card markup). Nothing else on `/pricing` changes (header, hero, i18n namespace untouched).

3. [x] **Rebuild `app/[locale]/page.tsx` as the three-section scaffold** (server component, keep the `setRequestLocale` + `getTranslations` shape). One `<main className="min-h-dvh bg-paper">` containing three stacked `Container` sections composed from existing primitives ONLY:
   - **Hero** — `Container className="py-24"`: `Title as="h1"` (`home.title`) + `Text size="base" leading` (`home.subtitle`) + a primary CTA `Button variant="primary" href="/signup"` (`home.cta`).
   - **Pricing** — a `Container` section: `Title as="h2"` heading + subtitle (new `home.pricingTitle` / reuse `pricing.subtitle`), then `PLANS.map` → `PlanCard` inside `<div className="mt-12 flex flex-wrap gap-6">` (same layout as `/pricing`). Uses `getTranslations("pricing")` for the card strings.
   - **Closing CTA** — a final `Container` section: a short line (`home.closingTitle`) + a primary `Button href="/signup"` (`home.closingCta`).
     Tokens-only classes throughout (`bg-paper`, `text-*`, spacing utilities); responsive via existing utilities only (`Container` gutters, `flex flex-wrap gap-6`, `max-w-prose` / `max-w-sm`). No raw colour/arbitrary value.

4. [x] **CTA routing (AC2).** Hero + closing CTAs → `/signup` via `Button href=` (renders the `@/i18n/navigation` `Link`). Pricing CTAs = the existing `SubscribeButton` inside `PlanCard`: authed → `createCheckoutSession` → Stripe; anon → `createCheckoutSession` returns `unauthenticated` → `window.location.href = "/login"`. **Honest flow: anon visitor lands on `/login` then on `/dashboard` after auth — there is NO auto-resume-checkout** (the `?redirect=` param is not consumed post-auth; `proxy.ts:69-73`). Do not add, promise, or wire any resume-after-signup behaviour.

5. [x] **Add i18n keys to BOTH `messages/fr.json` and `messages/en.json`** (parity, in the existing `home` namespace): `home.pricingTitle`, `home.closingTitle`, `home.closingCta`. Reuse existing `home.title` / `home.subtitle` / `home.cta` and the entire `pricing.*` namespace verbatim for the cards (no duplicated plan strings). Any key added on one side must exist on the other.

6. [x] **Tests (source-level + parity, mirror repo convention — no DOM runner).** Add `app/[locale]/page.test.ts` (source inspection like `logo.test.ts` / `app-sidebar.test.ts`):
   - landing source imports `PLANS` from `@/lib/stripe/config` and references `PlanCard` + `PLANS.map` (renders all plans from the shared source — AC1 anti-divergence).
   - hero/closing CTA links to signup (source contains `href="/signup"`).
   - landing source contains no raw colour (hex/`rgb(`/`hsl(`) — fast local AC3 guard, same pattern as `app-sidebar.test.ts`.
   - `app/[locale]/pricing/page.tsx` source references `PlanCard` (both surfaces consume the shared component — divergence pinned).
     The fr/en parity of the new `home.*` keys is already covered by `messages/messages.test.ts` (extends automatically). Keep tests honest about altitude: source-level, not DOM render (repo runs vitest `environment: node`, adding jsdom = a forbidden new dep).

## Run interdicts

- The pricing section MUST read the shared `PLANS` (`@/lib/stripe/config`); a hardcoded plan list = FAIL (divergence from s06).
- Both `/` and `/pricing` MUST render the plan card via the shared `PlanCard`; a copy-pasted inline card on either side = FAIL.
- Extracting `PlanCard` MUST NOT change `/pricing`'s rendered output (same wrapper + card markup + `SubscribeButton` props).
- Tokens-only: no raw hex/rgb/hsl or arbitrary values anywhere (`scripts/check-design-tokens.mjs` prebuild guard).
- No hardcoded UI string: every text via an i18n key, fr+en updated together.
- Internal links via `@/i18n/navigation` (`Button href=` / `Link`) — never `next/link`.
- Reuse `SubscribeButton` as-is; do not fork a second checkout path or re-implement `createCheckoutSession`.
- Do NOT promise/wire auto-resume-checkout after signup (`?redirect=` is not honoured post-auth).
- Do NOT build a marketing site (testimonials, feature grid, FAQ, logo wall, comparison table, animation) — scaffold = hero + pricing + CTA only.
- No new npm dependency. Do not touch `proxy.ts`, `scripts/check-design-tokens.mjs`, the Stripe webhook, or `lib/actions/checkout.ts`.
- Landing stays a server component (imports `server-only` `PLANS`); the click stays in the client `SubscribeButton` island.

## The point everything turns on

The plan rests on **extract-and-reuse `PlanCard`** as the anti-divergence mechanism. Three places it could be wrong:

1. **The extraction changes `/pricing`'s output.** Compare the rewired `pricing/page.tsx` render against the current `:52-77` markup — wrapper div classes, `Card pad="lg" className="w-full max-w-sm"`, the `Title h2` / price / features / `SubscribeButton` order and props must be identical. The reviewer confirms `/pricing` is unchanged.
2. **`PlanCard` prop shape leaks a client boundary.** `PlanCard` must stay a server component; only `SubscribeButton` (already `"use client"`) is the island. Passing the `t` translator into a server child is fine (both are server); do not accidentally mark `PlanCard` `"use client"`.
3. **The AC2 flow is overstated.** Compare the wording of any hero/closing copy and the plan's claims against `proxy.ts:69-73` + `lib/actions/checkout.ts:22` — the anon path ends at `/login`→`/dashboard`, not a resumed checkout. No copy or comment may imply otherwise.

## Files touched

- `app/[locale]/page.tsx` — rewritten as the three-section scaffold (hero + pricing + closing CTA).
- `components/pricing/plan-card.tsx` — **new**, extracted shared server component.
- `app/[locale]/pricing/page.tsx` — rewired to use `PlanCard` (no output change).
- `messages/fr.json` + `messages/en.json` — add `home.pricingTitle`, `home.closingTitle`, `home.closingCta` (parity).
- `app/[locale]/page.test.ts` — **new**, source-level assertions.

Not touched: `lib/stripe/config.ts`, `subscribe-button.tsx`, `lib/actions/checkout.ts`, `proxy.ts`, `scripts/check-design-tokens.mjs`, the webhook.

## Test strategy

Unit / source-level altitude (repo runs vitest `environment: node`; no jsdom, no DOM render — matching `logo.test.ts` and `app-sidebar.test.ts`, and honouring the no-new-dep interdict):

- **AC1 (all plans from the shared source):** landing source imports `PLANS` and references `PlanCard` + `PLANS.map`.
- **Anti-divergence:** both `page.tsx` and `pricing/page.tsx` sources reference `PlanCard`.
- **AC2 (routing):** landing source contains `href="/signup"` for the hero/closing CTAs; the pricing CTA is `SubscribeButton` (unchanged).
- **AC3 (tokens):** landing source contains no raw colour (hex/`rgb(`/`hsl(`) — the authoritative gate remains the `check-design-tokens` prebuild.
- **AC4 (i18n parity):** covered by `messages/messages.test.ts`, which flattens fr/en and fails on any asymmetry — the new `home.*` keys are picked up automatically.

## Definition of Done

- Single PR on `feature/s07-landing`, readable diff, structured description.
- `/` renders hero + pricing (from shared `PLANS` via `PlanCard`) + closing CTA; `/pricing` output unchanged.
- Hero/closing CTA → `/signup`; pricing CTA via `SubscribeButton` (authed → Stripe, anon → `/login`); no resume-checkout claim.
- Tokens-only (prebuild guard green), responsive via existing utilities, all strings i18n fr+en with parity.
- New + existing tests pass (`messages.test.ts`, `app/[locale]/page.test.ts`, s06 pricing/webhook tests); no regression.
- Review passed (no open critical), then deployed.
