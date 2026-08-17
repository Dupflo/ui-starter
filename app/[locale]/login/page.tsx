import { setRequestLocale, getTranslations } from "next-intl/server"
import { AuthShell } from "@/components/auth/auth-shell"
import { LoginForm } from "@/components/auth/login-form"

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("auth")
  return (
    <AuthShell footer={t("footer")}>
      <LoginForm />
    </AuthShell>
  )
}
