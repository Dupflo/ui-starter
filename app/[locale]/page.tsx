import { setRequestLocale, getTranslations } from "next-intl/server"
import { Container } from "@/components/ui/container"
import { Title } from "@/components/ui/title"
import { Text } from "@/components/ui/text"
import { Button } from "@/components/ui/button"
import { PLANS } from "@/lib/stripe/config"
import { PlanCard } from "@/components/pricing/plan-card"
import { Logo } from "@/components/brand/logo"
import { LocaleMenu } from "@/components/ui/locale-menu"

/**
 * Landing page — three-section scaffold: hero + pricing + closing CTA.
 *
 * Public route (not in PROTECTED proxy list).
 * Server component: reads PLANS (server-only) and translates all strings.
 * Client island: SubscribeButton inside PlanCard (authed → Stripe, anon → /login).
 *
 * CTA routing (AC2):
 *   - Hero and closing CTAs → /signup (Button href, rendered as i18n Link).
 *   - Pricing CTA = SubscribeButton (unchanged from s06); anon flow ends at
 *     /login → /dashboard (no auto-resume-checkout — proxy.ts:69-73).
 *
 * Tokens-only (ADR 002): no raw hex/rgb/hsl — check-design-tokens guard at prebuild.
 * i18n (AC4): all strings via keys, fr+en parity enforced by messages.test.ts.
 */
export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const tHome = await getTranslations("home")
  const tPricing = await getTranslations("pricing")

  return (
    <>
      {/* ── Minimal landing header — Logo + LocaleMenu (pine bar) ──── */}
      <header className="bg-pine print-hide">
        <Container className="flex items-center justify-between py-4">
          <Logo />
          <LocaleMenu />
        </Container>
      </header>

      <main className="min-h-dvh bg-paper">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <Container className="py-24">
          <Title as="h1">{tHome("title")}</Title>
          <Text size="base" leading className="mt-4 max-w-prose">
            {tHome("subtitle")}
          </Text>
          <div className="mt-8">
            <Button variant="primary" href="/signup">
              {tHome("cta")}
            </Button>
          </div>
        </Container>

        {/* ── Pricing ───────────────────────────────────────────────────── */}
        <Container className="py-16">
          <Title as="h2">{tHome("pricingTitle")}</Title>
          <Text size="base" leading className="mt-4 max-w-prose">
            {tPricing("subtitle")}
          </Text>
          <div className="mt-12 flex flex-wrap gap-6">
            {PLANS.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                planName={tPricing(
                  plan.nameKey as Parameters<typeof tPricing>[0],
                )}
                planPrice={tPricing(
                  plan.priceLabelKey as Parameters<typeof tPricing>[0],
                )}
                planFeatures={
                  plan.featuresKey
                    ? tPricing(
                        plan.featuresKey as Parameters<typeof tPricing>[0],
                      )
                    : undefined
                }
                subscribeLabel={tPricing("subscribe")}
                pendingLabel={tPricing("subscribePending")}
                loginMessage={tPricing("loginMessage")}
              />
            ))}
          </div>
        </Container>

        {/* ── Closing CTA ───────────────────────────────────────────────── */}
        <Container className="py-16">
          <Title as="h2">{tHome("closingTitle")}</Title>
          <div className="mt-8">
            <Button variant="primary" href="/signup">
              {tHome("closingCta")}
            </Button>
          </div>
        </Container>
      </main>
    </>
  )
}
