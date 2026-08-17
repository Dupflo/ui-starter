import { getTranslations, setRequestLocale } from "next-intl/server"
import { redirect } from "@/i18n/navigation"
import { getUser } from "@/lib/supabase/server"
import { loadDashboard } from "@/lib/data/dashboard"
import { getSubscription, isActiveSubscriber } from "@/lib/data/subscription"
import { AppHeader } from "@/components/app/app-header"

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("dashboard")
  const tNav = await getTranslations("appNav")
  const tPricing = await getTranslations("pricing")

  const user = await getUser()
  if (!user) {
    redirect({ href: "/login", locale })
    return null
  }
  const data = await loadDashboard(user.id)

  // AC4 — gate: read subscription server-side, never trust client input.
  const sub = await getSubscription(user.id)
  const isSubscriber = isActiveSubscriber(sub?.status)

  return (
    <>
      <AppHeader title={tNav("dashboard")} />

      <div className="p-6 md:p-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-strong">
          {t("greeting", { name: data.displayName })}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>

        {/* Premium section — visible only to active subscribers (AC4). */}
        {isSubscriber && (
          <div className="mt-8 rounded-2xl border border-line bg-paper p-6">
            <p className="font-display text-lg font-semibold text-ink-strong">
              {tPricing("premiumTitle")}
            </p>
            <p className="mt-1 text-sm text-muted">
              {tPricing("premiumSubtitle")}
            </p>
          </div>
        )}
      </div>
    </>
  )
}
