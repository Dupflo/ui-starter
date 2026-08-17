import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { redirect } from "@/i18n/navigation"
import { getUser } from "@/lib/supabase/server"
import { getRole, isAdmin } from "@/lib/data/identity"
import { AppHeader } from "@/components/app/app-header"

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("admin")
  const tNav = await getTranslations("appNav")

  // Auth gate: session required (middleware also enforces this via PROTECTED).
  const user = await getUser()
  if (!user) {
    redirect({ href: "/login", locale })
    return null
  }

  // Role gate: admin only. Server-side read — never trust a client-supplied role.
  // notFound() (404) is used rather than redirect to avoid revealing /admin exists.
  const role = await getRole(user.id)
  if (!isAdmin(role)) {
    notFound()
  }

  return (
    <>
      <AppHeader title={tNav("dashboard")} />

      <div className="p-6 md:p-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-strong">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
      </div>
    </>
  )
}
