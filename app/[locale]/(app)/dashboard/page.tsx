import { getTranslations, setRequestLocale } from "next-intl/server"
import { redirect } from "@/i18n/navigation"
import { getUser } from "@/lib/supabase/server"
import { loadDashboard } from "@/lib/data/dashboard"
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

  const user = await getUser()
  if (!user) {
    redirect({ href: "/login", locale })
    return null
  }
  const data = await loadDashboard(user.id)

  return (
    <>
      <AppHeader title={tNav("dashboard")} />

      <div className="p-6 md:p-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-strong">
          {t("greeting", { name: data.displayName })}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
      </div>
    </>
  )
}
