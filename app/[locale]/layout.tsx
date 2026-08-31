import type { Metadata } from "next"
import { NextIntlClientProvider, hasLocale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"
import { routing } from "@/i18n/routing"
import { CookieBanner } from "@/components/cookie-banner"
import { Analytics } from "@/components/analytics"
import { ClientErrorReporter } from "@/components/observability/client-error-reporter"
import { DemoBanner } from "@/components/demo/demo-banner"
import { plusJakartaSans, geist, geistMono } from "@/app/fonts"
import "../globals.css"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "metadata" })
  return {
    title: t("title"),
    description: t("description"),
    icons: { icon: "/favicon.svg" },
  }
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }
  setRequestLocale(locale)

  return (
    <html
      lang={locale}
      className={`${plusJakartaSans.variable} ${geist.variable} ${geistMono.variable}`}
    >
      <body>
        <NextIntlClientProvider>
          {/* s11-demo-mode T6 — unconditional when demo mode is active (a
              no-op <null> otherwise); never in the auth/business components. */}
          <DemoBanner />
          {children}
          <CookieBanner />
          <Analytics />
          <ClientErrorReporter />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
