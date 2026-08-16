import { setRequestLocale, getTranslations } from "next-intl/server"
import { AuthShell } from "@/components/auth/auth-shell"
import { SignupForm } from "@/components/auth/signup-form"

export default async function SignupPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("auth")
  return (
    <AuthShell footer={t("footer")}>
      <SignupForm />
    </AuthShell>
  )
}
