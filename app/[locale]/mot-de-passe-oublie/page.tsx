import { setRequestLocale, getTranslations } from "next-intl/server"
import { AuthShell } from "@/components/auth/auth-shell"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("auth")
  return (
    <AuthShell footer={t("footer")}>
      <ForgotPasswordForm />
    </AuthShell>
  )
}
