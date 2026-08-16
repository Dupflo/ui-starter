import { setRequestLocale, getTranslations } from "next-intl/server"
import { AppHeader } from "@/components/app/app-header"
import { SettingsForm } from "@/components/app/settings-form"
import type { SettingsProfile } from "@/components/app/settings-form"
import { getUser } from "@/lib/supabase/server"
import { getDisplayName } from "@/lib/data/identity"

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("appNav")

  const user = await getUser()
  const meta = user?.user_metadata as
    | { full_name?: string; name?: string }
    | undefined
  const displayName = user
    ? await getDisplayName(user.id, {
        fullName: meta?.full_name ?? meta?.name ?? null,
        email: user.email ?? null,
      })
    : null

  const profile: SettingsProfile = {
    fullName: displayName ?? "",
  }

  return (
    <>
      <AppHeader title={t("settings")} />
      <div className="p-6 md:p-10">
        <SettingsForm profile={profile} />
      </div>
    </>
  )
}
