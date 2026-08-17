import { setRequestLocale, getTranslations } from "next-intl/server"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Container } from "@/components/ui/container"
import { Title } from "@/components/ui/title"
import { Text } from "@/components/ui/text"
import { Link } from "@/i18n/navigation"
import { PLANS } from "@/lib/stripe/config"
import { SubscribeButton } from "./subscribe-button"

/**
 * Pricing page — rebuilt from PLANS (lib/stripe/config.ts).
 *
 * Public route (not in PROTECTED proxy list). Renders 1–2 plan cards using
 * design-system primitives only (tokens-only, no raw color/radius values).
 * Texts via i18n namespace "pricing" — no hard-coded UI strings.
 */
export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("pricing")

  return (
    <main className="min-h-dvh bg-paper">
      <header className="px-5 pt-3.5">
        <Container className="flex h-[62px] items-center justify-between">
          <Link href="/" aria-label="Home">
            <Logo />
          </Link>
          <Button
            href="/dashboard"
            size="sm"
            variant="subtle"
            className="font-semibold"
          >
            {t("dashboard")}
          </Button>
        </Container>
      </header>

      <Container className="py-24">
        <Title as="h1">{t("title")}</Title>
        <Text size="base" leading className="mt-4 max-w-prose">
          {t("subtitle")}
        </Text>

        <div className="mt-12 flex flex-wrap gap-6">
          {PLANS.map((plan) => (
            <Card key={plan.id} pad="lg" className="w-full max-w-sm">
              <Title as="h2">
                {t(plan.nameKey as Parameters<typeof t>[0])}
              </Title>
              <Text size="base" className="mt-2 font-semibold">
                {t(plan.priceLabelKey as Parameters<typeof t>[0])}
              </Text>
              {plan.featuresKey && (
                <Text size="sm" leading className="mt-4 text-muted">
                  {t(plan.featuresKey as Parameters<typeof t>[0])}
                </Text>
              )}
              <div className="mt-6">
                <SubscribeButton
                  priceId={plan.priceId}
                  label={t("subscribe")}
                  pendingLabel={t("subscribePending")}
                  loginMessage={t("loginMessage")}
                  loginHref="/login"
                />
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </main>
  )
}
