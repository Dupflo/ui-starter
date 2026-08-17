"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { TextField } from "@/components/ui/text-field"

const schema = z.object({ password: z.string().min(8, "authErrorPassword") })
type Values = z.infer<typeof schema>

/**
 * Nouveau mot de passe, après clic sur le lien de réinitialisation. À ce stade
 * /api/auth/callback a déjà ouvert une session : `updateUser` agit donc sur le
 * compte prouvé par le lien signé — pas besoin de repasser l'e-mail, qui serait
 * falsifiable.
 */
export function NewPasswordForm() {
  const t = useTranslations("newPassword")
  const ta = useTranslations("auth")
  const router = useRouter()
  const [authError, setAuthError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), mode: "onBlur" })

  const submit = async ({ password }: Values) => {
    setAuthError(null)
    setPending(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      // Session absente = lien expiré ou déjà consommé : on le dit franchement.
      setAuthError(t("error"))
      setPending(false)
      return
    }
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-strong">
        {t("title")}
      </h1>
      <p className="mt-1.5 text-sm text-muted">{t("subtitle")}</p>

      <div className="mt-5">
        <TextField
          label={t("passwordLabel")}
          type="password"
          registration={register("password")}
          error={
            errors.password?.message
              ? ta(errors.password.message as Parameters<typeof ta>[0])
              : undefined
          }
          autoFocus
        />
      </div>

      {authError ? (
        <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-xs leading-relaxed text-danger">
          {authError}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={pending}
        className="mt-5 w-full font-semibold"
      >
        {t("cta")}
      </Button>
    </form>
  )
}
