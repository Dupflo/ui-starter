import type { Metadata } from "next"
import { setRequestLocale, getTranslations } from "next-intl/server"
import {
  LegalTitle,
  LegalUpdated,
  LegalNotice,
  LegalP,
} from "@/components/legal/prose"
import { ConsentResetButton } from "@/components/legal/consent-reset"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "legal" })
  return { title: t("cookiesTitle") }
}

export default async function CookiesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("legal")

  return (
    <>
      <LegalTitle>{t("cookiesTitle")}</LegalTitle>
      <LegalUpdated>{t("cookiesUpdated")}</LegalUpdated>
      <LegalNotice>{t("placeholderNotice")}</LegalNotice>
      <LegalP>{t("cookiesBody")}</LegalP>
      <ConsentResetButton label={t("manageConsent")} />
    </>
  )
}
