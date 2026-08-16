import { setRequestLocale, getTranslations } from "next-intl/server"
import { Container } from "@/components/ui/container"
import { Title } from "@/components/ui/title"
import { Text } from "@/components/ui/text"

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
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
}
