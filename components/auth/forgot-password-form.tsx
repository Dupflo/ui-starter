"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { TextField } from "@/components/ui/text-field"
import { requestPasswordReset } from "@/lib/actions/password-reset"

const schema = z.object({ email: z.string().email("authErrorEmail") })
type Values = z.infer<typeof schema>

/**
 * Demande de réinitialisation. L'écran de confirmation est le MÊME que le compte
 * existe ou non — cf. la note d'énumération dans lib/actions/password-reset.ts.
 */
export function ForgotPasswordForm() {
  const t = useTranslations("forgot")
  const ta = useTranslations("auth")
  const [sent, setSent] = useState(false)
  const [pending, setPending] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), mode: "onBlur" })

  const submit = async ({ email }: Values) => {
    setPending(true)
    await requestPasswordReset(email)
    setSent(true)
  }

  if (sent) {
    return (
      <>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-strong">
          {t("sentTitle")}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          {t("sentBody")}
        </p>
        <Button
          href="/login"
          variant="subtle"
          size="lg"
          className="mt-5 w-full font-semibold"
        >
          {t("backToLogin")}
        </Button>
      </>
    )
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-strong">
        {t("title")}
      </h1>
      <p className="mt-1.5 text-sm text-muted">{t("subtitle")}</p>

      <div className="mt-5">
        <TextField
          label={ta("email")}
          type="email"
          registration={register("email")}
          error={
            errors.email?.message
              ? ta(errors.email.message as Parameters<typeof ta>[0])
              : undefined
          }
          autoFocus
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={pending}
        className="mt-5 w-full font-semibold"
      >
        {t("cta")}
      </Button>

      <p className="mt-4 text-center text-xs text-muted">
        <Link href="/login" className="font-semibold text-pine hover:underline">
          {t("backToLogin")}
        </Link>
      </p>
    </form>
  )
}
