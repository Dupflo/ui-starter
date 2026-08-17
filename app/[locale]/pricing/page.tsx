import { setRequestLocale, getTranslations } from "next-intl/server"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/ui/container"
import { Title } from "@/components/ui/title"
import { Text } from "@/components/ui/text"
import { Link } from "@/i18n/navigation"

/**
 * Placeholder neutre. Le vrai catalogue d'offres (abonnements Stripe) est
 * construit dans une story ultérieure ; on garde la route pour préserver le
 * chemin `/pricing`.
 */
export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("home")

  return (
    <main className="min-h-dvh bg-paper">
      <header className="px-5 pt-3.5">
        <Container className="flex h-[62px] items-center justify-between">
          <Link href="/" aria-label="Home">
            <Logo />
          </Link>
          <Button href="/dashboard" size="sm" className="font-semibold">
            {t("cta")}
          </Button>
        </Container>
      </header>

      <Container className="py-24">
        <Title as="h1">{t("title")}</Title>
        <Text size="base" leading className="mt-4 max-w-prose">
          {t("subtitle")}
        </Text>
      </Container>
    </main>
  )
}
