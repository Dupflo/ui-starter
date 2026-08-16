import { setRequestLocale, getTranslations } from "next-intl/server"
import { AuthShell } from "@/components/auth/auth-shell"
import { NewPasswordForm } from "@/components/auth/new-password-form"

// Atterrissage du lien de réinitialisation : /api/auth/callback a posé la session
// avant de rediriger ici.
export const dynamic = "force-dynamic"

export default async function NewPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("auth")
  return (
    <AuthShell footer={t("footer")}>
      <NewPasswordForm />
    </AuthShell>
  )
}
