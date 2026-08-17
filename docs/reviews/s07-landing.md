# Review — s07-landing

Fresh-context anti-hallucination review. Branch `feature/s07-landing` @ `90b911a`, diff `git diff main...feature/s07-landing`.

## Gate (run locally, Node 22.17.0 via .nvmrc)

| Command               | Result                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| `npm run typecheck`   | PASS (tsc --noEmit, clean)                                                                          |
| `npm run lint`        | PASS — 0 errors, 4 warnings (all pre-existing in `components/ui/modal.tsx`, untouched by this diff) |
| `npm run lint:design` | PASS — no arbitrary values in 85 files                                                              |
| `npm run test`        | PASS — 16 files, 88 tests                                                                           |
| `npm run build`       | PASS — `/[locale]` and `/[locale]/pricing` prerendered (SSG)                                        |

Test bites: injected `bg-[#ff0000]` into `page.tsx`, the AC3 no-raw-colour test failed (1 failed / 5 passed); reverted clean. The guard is real, not a rubber stamp.

## AC coverage

- **AC1 (hero + pricing from shared PLANS + CTA)** — MET. `app/[locale]/page.tsx` imports `PLANS` from `@/lib/stripe/config` (the s06 single source, `server-only`) and renders `PLANS.map(plan => <PlanCard ... />)`. No hardcoded/copied plan list. `Plan` type and `PLANS` verified to exist in `lib/stripe/config.ts:13,26`.
- **AC2 (pricing CTA → signup/checkout)** — MET, honest. Hero + closing CTAs → `/signup` via `Button href=` (renders `@/i18n/navigation` Link, verified `components/ui/button.tsx:35,48-50`). Pricing CTA = the existing `SubscribeButton` (authed → `createCheckoutSession` → Stripe; anon → `/login`, `subscribe-button.tsx:41-45`). No second checkout path forked. The doc comment's no-auto-resume-checkout claim is accurate: `proxy.ts` PROTECTED = `["/dashboard","/settings","/admin"]`, `/` and `/signup` public, `?redirect=` not consumed post-auth.
- **AC3 (tokens + responsive)** — MET. Only token classes (`bg-paper`, `text-muted`, `max-w-prose`, `max-w-sm`, `flex flex-wrap gap-6`, spacing utilities). `lint:design` green. Responsive via existing `Container` gutters + flex-wrap.
- **AC4 (i18n fr/en)** — MET. All strings via keys. New `home.pricingTitle/closingTitle/closingCta` present in BOTH `messages/fr.json` and `messages/en.json` (parity verified: identical key sets). Card strings reuse the `pricing.*` namespace verbatim; every consumed key (`subtitle`, `planPro*`, `subscribe`, `subscribePending`, `loginMessage`) exists.

## Load-bearing checks

1. **Anti-divergence is real** — CONFIRMED. `PlanCard` extracted to `components/pricing/plan-card.tsx`; both `page.tsx` (landing) and `pricing/page.tsx` render it from the same `PLANS`. No copy-paste on the landing.
2. **`/pricing` output unchanged** — CONFIRMED. The extracted card is byte-equivalent to the pre-diff inline markup: same `<div className="mt-12 flex flex-wrap gap-6">` wrapper, same `Card pad="lg" className="w-full max-w-sm"`, same `Title as="h2"` / price `Text ... mt-2 font-semibold` / optional features `Text ... mt-4 text-muted` / `<div className="mt-6"><SubscribeButton .../></div>` order, and the same `SubscribeButton` props (`priceId`, `label`, `pendingLabel`, `loginMessage`, `loginHref="/login"`). Only change: strings resolved by the caller and passed in (translator call moved up, output identical).
3. **Server/client boundary** — CONFIRMED. `PlanCard` is a server component; the only "use client" reference in the file is inside a doc comment (line 26), not a directive. Landing has no `"use client"` and imports the `server-only` `PLANS` directly. `SubscribeButton` remains the sole client island.
4. **Scaffold only** — CONFIRMED. Three sections (hero, pricing, closing CTA). No testimonials/FAQ/feature-grid/logo-wall.
5. **Interdicts** — CONFIRMED. No new npm dep (no `package.json` change). `proxy.ts`, `scripts/check-design-tokens.mjs`, the Stripe webhook, `lib/actions/checkout.ts`, `subscribe-button.tsx`, `lib/stripe/config.ts` all untouched.

## Plan vs diff

All six plan tasks present and faithful; nothing in the diff the plan didn't ask for. Tests are source-level (honest given vitest `environment: node`, no DOM runner — adding jsdom would be a forbidden dep) and pin: PLANS import, PlanCard reference, `PLANS.map`, `href="/signup"`, no-raw-colour, and both surfaces referencing `PlanCard` (anti-divergence). fr/en parity is covered by the existing `messages/messages.test.ts`.

## Findings

- **[minor] Hero CTA label/route semantics** — The hero CTA reuses `home.cta` = "Open the app" / "Accéder à l'app" but routes to `/signup`. The label reads as "go to the app" while the target is the signup page. Not a bug (the route is correct per AC2, and the closing CTA "Create my account" / "Créer mon compte" is accurate), but the hero label wording is slightly off for a conversion CTA on a public landing. Cosmetic copy nit, non-blocking.

No critical or major issues. Diff matches plan, ACs pinned, `/pricing` regression-free, boundaries and interdicts respected.

Max severity: minor
Ship allowed: yes
