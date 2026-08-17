import { cookies } from "next/headers"
import { setRequestLocale } from "next-intl/server"
import { getUser } from "@/lib/supabase/server"
import { getDisplayName, initialsOf, getAvatarUrl } from "@/lib/data/identity"
import { ensureProfile } from "@/lib/data/ensure-profile"
import { AppShell } from "@/components/app/app-shell"

/** Cookie mémorisant l'état replié de la sidebar (préférence utilisateur). */
export const SIDEBAR_COOKIE = "app_sidebar_collapsed"

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const user = await getUser()

  if (user) {
    // Garantit une ligne `profiles` pour cet utilisateur (idempotent).
    const signupMeta = user.user_metadata as
      | { full_name?: string; name?: string }
      | undefined
    await ensureProfile(user.id, {
      fullName: signupMeta?.full_name ?? signupMeta?.name ?? null,
    })
  }

  // Identité réelle du badge de la sidebar.
  const meta = user?.user_metadata as
    | { full_name?: string; name?: string }
    | undefined
  const displayName = user
    ? await getDisplayName(user.id, {
        fullName: meta?.full_name ?? meta?.name ?? null,
        email: user.email ?? null,
      })
    : null
  const photoUrl = user ? await getAvatarUrl(user.id) : null

  // Préférence sidebar lue côté serveur -> pas de flash au chargement.
  const sidebarCollapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "1"

  return (
    <AppShell
      user={{ name: displayName, initials: initialsOf(displayName), photoUrl }}
      sidebarCollapsed={sidebarCollapsed}
    >
      {children}
    </AppShell>
  )
}
