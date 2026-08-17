# Research — Story s07-landing

## The five structuring facts

1. **The single source of plan truth already exists and is shared by design.** `lib/stripe/config.ts:26` exports `PLANS: Plan[]`, whose doc-comment (`lib/stripe/config.ts:8`) literally says _"Shared by: pricing page, checkout action, and s07 landing."_ The anti-divergence mechanism is: the landing reads the same `PLANS` array. It cannot diverge from checkout because both render from one constant.
2. **The pricing card + CTA are already built for `/pricing` (s06) and are directly reusable.** `app/[locale]/pricing/page.tsx:52-77` renders one `Card` per plan from `PLANS` using DS primitives only; the per-plan CTA is `app/[locale]/pricing/subscribe-button.tsx` (a `"use client"` component). The anti-divergence decision for s07 is therefore **extract-and-reuse**, not rebuild: factor the plan card into a shared component so `/` and `/pricing` render identically.
3. **`config.ts` is `import "server-only"` (`lib/stripe/config.ts:1`) — the landing must be a server component to import `PLANS`.** The current home (`app/[locale]/page.tsx:1-25`) already is one (`getTranslations` from `next-intl/server`), so importing `PLANS` is legal exactly as `pricing/page.tsx:9` does. No client boundary problem for reading plans; only the CTA is a client island.
4. **The CTA flow for a logged-out visitor is: click → `createCheckoutSession` returns `{ ok:false, error:"unauthenticated" }` → redirect to `/login`** (`lib/actions/checkout.ts:22-23` + `subscribe-button.tsx:41-46`). This satisfies AC2 ("route vers l'inscription/checkout") as-is: authed visitor → Stripe, anon visitor → login. See trap below on `?redirect=` not being honored post-auth.
5. **The `home` namespace already carries a `cta` key** (`messages/fr.json` / `messages/en.json`, `home` block), and the `pricing` namespace holds every plan/label/CTA string (`planProName`, `planProPrice`, `planProFeatures`, `subscribe`, `subscribePending`, `loginMessage`). The landing reuses `pricing.*` for the plan cards verbatim and only adds a few `home.*` keys for the hero + closing CTA — no duplicated plan strings.

## Target story

**s07-landing** — Landing scaffold (`docs/stories.md:145`). Minimal hero + pricing + CTA, NOT a full marketing sales landing (that's graveyard: `docs/stories.md:161`). Complexity scored **2**. Depends on s02 (tokens, merged) + s06 (billing, merged) — both present on the branch (`git log`: s02 `#2`, s06 `#6`).

Acceptance criteria (`docs/stories.md:151-155`):

- AC1 — Renders a hero, a pricing section (**same plans as the Stripe config**), and a CTA.
- AC2 — The pricing CTA routes to signup/checkout.
- AC3 — Uses design tokens + is responsive.
- AC4 — Texts go through i18n keys (fr/en ready).

Story note (`docs/stories.md:162`): _"La section pricing lit la même source de plans que s06 pour éviter la divergence."_

## Current state of the code

### Current home (what s07 expands) — `app/[locale]/page.tsx:1-25`

Minimal neutral placeholder: a server component that sets the locale, pulls the `home` namespace, and renders only a hero `Title as="h1"` + a `Text` subtitle inside a centered `Container`. No pricing, no CTA. Verbatim:

```tsx
const t = await getTranslations("home")
return (
  <main className="flex min-h-dvh items-center bg-paper">
    <Container className="py-24">
      <Title as="h1">{t("title")}</Title>
      <Text size="base" leading className="mt-4 max-w-prose">
        {t("subtitle")}
      </Text>
    </Container>
  </main>
)
```

It is a **public** route (`/` is not in the proxy `PROTECTED` list — `proxy.ts:9` lists only `/dashboard`, `/settings`, `/admin`). Good: the landing stays reachable while logged out.

### The s06 pricing implementation (the reuse target)

- `app/[locale]/pricing/page.tsx` — public route, server component, `t = getTranslations("pricing")`. Header with `Logo` + a `subtle` Button to `/dashboard`. Body: `Title h1` + subtitle, then `PLANS.map` → `Card pad="lg" className="w-full max-w-sm"` containing `Title as="h2"` (name), a bold `Text` (price), an optional muted `Text` (features), and a `SubscribeButton`. Cards laid out with `flex flex-wrap gap-6`.
- `app/[locale]/pricing/subscribe-button.tsx` — `"use client"`; local `pending`/`message` state; calls `createCheckoutSession(priceId)`; on `ok` sets `window.location.href = result.url`; on `unauthenticated` shows `loginMessage` then `window.location.href = loginHref`. Renders a `Button` (default `primary`/lime).

### The plan source — `lib/stripe/config.ts`

`Plan` type (`:13-24`): `{ id, priceId, nameKey, priceLabelKey, featuresKey? }`. `PLANS` (`:26-34`) currently holds **one** plan (`id:"pro"`, `priceId: process.env.STRIPE_PRICE_PRO ?? ""`, keys `planProName/planProPrice/planProFeatures`). Helpers: `getPlanByPriceId` (`:40`), `getPlanById` (`:47`). `"server-only"` at `:1`.

### Design derivation (inline — replaces a separate design doc)

Read `docs/design-system.md` fully. Everything the scaffold needs already exists; **zero new components or tokens required** (see Gap section). The landing composes:

**Primitives** (all from `components/ui/*`): `Container` (page width `max-w-6xl` + responsive gutters, `container.tsx:11`), `Title` (tag = API: `h1` hero, `h2`/`h3` section, `title.tsx:6-11`), `Text` (`size`/`tone`/`leading`, `text.tsx`), `Button` (`variant="primary"` = lime CTA, `href` → i18n `Link`, `button.tsx:12-22,48-53`), `Card` (`variant="surface"` default, `pad="lg"`, radius/border/bg come from here — `card.tsx`), `SectionLabel` (optional numbered kicker for the pricing section, `section-label.tsx`). The per-plan CTA reuses `SubscribeButton`.

**Tokens** (classes only, per ADR 002 — the `check-design-tokens` guard fails the build on any raw hex/rgb): surfaces `bg-paper` / `bg-sand`; text `text-ink` / `text-muted` / `text-ink-strong`; borders `border-line`; accent via `Button variant="primary"` (lime, dark text on lime — never white). Type via `font-display` (titles) / `font-ui` (body), already baked into the primitives.

**Layout — three stacked sections inside one `<main className="min-h-dvh bg-paper">`:**

1. **Hero** — `Container` with vertical padding (`py-24`, matching page.tsx). `Title as="h1"` (`home.title`) + `Text size="base" leading` subhead (`home.subtitle`) + a primary CTA `Button variant="primary" href="/pricing"` (or `/signup`) using `home.cta`. Optionally a `SectionLabel` kicker.
2. **Pricing** — a `Container` section: an optional `Title as="h2"` + subtitle (reuse `pricing.title` / `pricing.subtitle`), then the **shared plan-card component** mapped over `PLANS`, laid out `flex flex-wrap gap-6` (the exact s06 pattern — already responsive: one column stacked on mobile, wraps side-by-side when a second plan is added). Each card = `Card pad="lg" className="w-full max-w-sm"` with name/price/features + `SubscribeButton`.
3. **Closing CTA** — a final `Container` (or a `Card variant="pine"` band) with a short line + a primary `Button` to `/pricing` or `/signup`. Reuse `home.cta` or one new `home.*` key.

**Responsive (AC3):** achieved with existing utilities only — `Container` gutters (`px-6 md:px-8`), `flex flex-wrap gap-6` for the cards, `max-w-prose` / `max-w-sm` constraints, `min-h-dvh`. No custom breakpoints or raw values needed. This mirrors what `pricing/page.tsx` already ships.

## Anchor points

- **File to expand:** `app/[locale]/page.tsx` (the whole file is replaced by the three-section scaffold; keep the server-component shape).
- **Plan source to import:** `import { PLANS } from "@/lib/stripe/config"` (as `pricing/page.tsx:9`).
- **CTA island to reuse:** `import { SubscribeButton } from "..."` — see reuse note below.
- **Shared card component (recommended new file):** extract the plan card currently inline at `pricing/page.tsx:53-76` into e.g. `components/pricing/plan-card.tsx` (server component that takes a `Plan` + the translator), then have BOTH `page.tsx` (landing) and `pricing/page.tsx` render it. This is the anti-divergence guarantee at the render level (fact 2). If the plan opts to keep it inline in both places instead, it must at minimum share `PLANS` (which it already does) — but a shared card is the stronger, cheaper-to-maintain choice.
- **Internal links:** `@/i18n/navigation` `Link` / `Button href=` only — never `next/link` (`design-system.md:90`).
- **i18n:** `getTranslations("home")` for hero/closing, `getTranslations("pricing")` for the plan cards (reuse), both fr+en.

## Verified APIs / functions

- `PLANS: Plan[]` — `lib/stripe/config.ts:26`. `Plan = { id, priceId, nameKey, priceLabelKey, featuresKey? }` (`:13`). `"server-only"`.
- `createCheckoutSession(priceId: string): Promise<CheckoutResult>` — `lib/actions/checkout.ts:19`; `CheckoutResult = { ok:true; url } | { ok:false; error }` (`:8`). Derives identity from `getUser()`; returns `"unauthenticated"` when no session (`:22`), `"invalid_price"` for unknown priceId (`:27`).
- `SubscribeButton({ priceId, label, pendingLabel, loginMessage, loginHref })` — `app/[locale]/pricing/subscribe-button.tsx:25`. Client component.
- `Button({ variant, size, href, ... })` — `components/ui/button.tsx:38`; `href` renders an i18n `Link` (`:48`); `variant="primary"` = lime (`:14`).
- `Title({ as })` — `components/ui/title.tsx:16`; `Container` — `container.tsx:3`; `Card({ variant, pad, as })` / `SectionLabel({ index, tone })` per design-system table.
- Existing i18n keys reused: `home.title`, `home.subtitle`, `home.cta`; `pricing.planProName`, `pricing.planProPrice`, `pricing.planProFeatures`, `pricing.subscribe`, `pricing.subscribePending`, `pricing.loginMessage` (both `messages/fr.json` and `messages/en.json`).

## Traps & constraints

- **Tokens-only guard (ADR 002).** `scripts/check-design-tokens.mjs` runs at `prebuild` and fails on any raw color/radius/font-size/tracking/shadow (`design-system.md:5,99`). Every class must be a token class. Lime is an accent, never a large background fill; dark text on lime, never white (`design-system.md:101`).
- **i18n fr+en parity.** AC4 + s08's guarantee: any new `home.*` (or `landing.*`) key must exist in BOTH `messages/fr.json` and `messages/en.json`, or `messages.test.ts` / runtime breaks. No hard-coded UI string.
- **`@/i18n/navigation`, not `next/link`** for every internal link/CTA (`design-system.md:90`).
- **Server vs client boundary.** The landing page is a server component (needs `PLANS` which is `server-only`). The checkout CTA MUST stay in the client `SubscribeButton` island — do not turn the page into a client component to handle the click.
- **`?redirect=` is not honored post-auth (routing subtlety for AC2).** The proxy appends `?redirect=<target>` when bouncing a protected route to `/login` (`proxy.ts:52-54`), but the auth flow always lands the user on `/dashboard` after login (`proxy.ts:69-73`; no auth action consumes `redirect` — only `password-reset.ts` uses a `redirectTo`). So the logged-out CTA flow is **visitor → `/login` → `/dashboard`**, NOT visitor → login → auto-resume-checkout. This still satisfies AC2 (routes to signup/checkout), but the plan should not promise a "resume checkout after signup" behavior that the codebase doesn't implement. If a smoother flow is wanted, that's a separate change (out of this scaffold's scope).
- **Don't rebuild a marketing site (graveyard).** Testimonials, feature grids, FAQ, logos-wall, comparison tables, animated sections = out (`docs/stories.md:161`). Scaffold = hero + pricing + CTA, nothing more.
- **Reuse over duplication.** If the plan card is copy-pasted into `page.tsx` instead of shared, the two surfaces can drift on markup even while sharing `PLANS` data. Prefer the extracted `plan-card` component. Extracting also means touching `pricing/page.tsx` (a merged file) — a light, no-behavior-change refactor; keep its rendered output identical and its tests green.
- **Single lime accent per surface.** The hero primary CTA and the plan-card subscribe buttons are both `primary` (lime). That's fine across distinct sections, but avoid stacking multiple lime CTAs within one visual block (`design-system.md:96`).

## Open questions

- **Hero/closing CTA target:** `/pricing` (scroll/route to plans) vs `/signup` (start account) vs an in-page anchor to the pricing section. AC2 only constrains the _pricing_ CTA; the hero CTA target is a plan/design choice. Recommendation: hero → `/signup` (or `/pricing`), pricing card → existing `SubscribeButton` (unchanged), closing → `/signup`. To settle at `/ks-plan`.
- **Shared card extraction vs inline:** extract `plan-card.tsx` (recommended, touches `pricing/page.tsx`) vs duplicate inline (simpler diff, weaker anti-divergence). To settle at `/ks-plan` — but the story note ("même source de plans … éviter la divergence") leans toward extraction.
- **New key namespace:** add hero/closing keys under the existing `home` namespace vs a new `landing` namespace. `home` already has `title`/`subtitle`/`cta`; extending `home` is the lower-friction choice.

## Real complexity

**Confirmed: 2.** Every dependency is already built and reusable: `PLANS` is the ready-made shared source, the plan card + `SubscribeButton` + checkout action all exist from s06, all primitives and tokens exist, and the home page is already a server component in the right shape. The work is composition + a handful of i18n keys (fr+en) + an optional low-risk extraction of the plan card. No new tokens, no new DS components, no server/client re-architecture, no data layer. The only genuine care items are guard-safe token usage, fr/en parity, and keeping the reused `pricing/page.tsx` behavior identical if the card is extracted — all routine. No split needed.

## Split proposal

Not required (verdict 2).

## Design-system gap

**None.** The scaffold composes entirely within the existing system (`Container`, `Title`, `Text`, `Button`, `Card`, `SectionLabel`, `SubscribeButton`) and existing token classes. No component, variant, badge tone, or token is missing. If, while planning, a closing-CTA "band" wants a full-width pine surface, use `Card variant="pine"` (already in the system) rather than inventing anything.
