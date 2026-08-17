import type { Metadata } from "next"
import { setRequestLocale, getTranslations } from "next-intl/server"
import {
  LegalTitle,
  LegalUpdated,
  LegalNotice,
  LegalP,
} from "@/components/legal/prose"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "legal" })
  return { title: t("privacyTitle") }
}

export default async function ConfidentialitePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("legal")

  return (
    <>
      <LegalTitle>{t("privacyTitle")}</LegalTitle>
      <LegalUpdated>{t("privacyUpdated")}</LegalUpdated>
      <LegalNotice>{t("placeholderNotice")}</LegalNotice>
      <LegalP>{t("privacyBody")}</LegalP>
    </>
  )
}
