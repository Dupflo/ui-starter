"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { TextField } from "@/components/ui/text-field"
import { GoogleButton } from "./google-button"
import { signupSchema, type SignupValues } from "./schemas"

export function SignupForm() {
  const t = useTranslations("auth")
  const [authError, setAuthError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    mode: "onBlur",
  })

  const errKey = (k: keyof SignupValues) => {
    const m = errors[k]?.message
    return m ? t(m as Parameters<typeof t>[0]) : undefined
  }

  // Ce formulaire ne créait AUCUN compte : il validait puis poussait vers le
  // dashboard. Il crée désormais réellement le compte (le nom part en métadonnée
  // et alimente le profil).
  const submit = async ({ name, email, password }: SignupValues) => {
    setAuthError(null)
    setPending(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    if (error) {
      // Compte déjà pris vs le reste : deux messages, deux actions possibles.
      setAuthError(
        /registered|already/i.test(error.message)
          ? t("authErrorEmailTaken")
          : t("authErrorSignup"),
      )
      setPending(false)
      return
    }
    // Confirmation d'e-mail activée côté Supabase → pas de session tant que le
    // lien n'est pas cliqué. On le dit plutôt que d'envoyer sur un dashboard
    // qui rejetterait l'utilisateur.
    if (!data.session) {
      setAuthError(t("authErrorConfirmEmail"))
      setPending(false)
      return
    }
    // Navigation DURE, et non `router.push` + `router.refresh`. Le cookie de
    // session vient d'être écrit par le client Supabase : une transition côté
    // client envoie sa requête RSC avant que le serveur ne voie ce cookie, et le
    // `refresh()` qui suivait annulait la navigation en vol — le compte était
    // créé, mais l'utilisateur restait figé sur le formulaire, bouton désactivé
    // et sans message. Un chargement complet garantit que le serveur reçoit la
    // session : le layout (app) accorde alors les crédits d'inscription dès le
    // premier rendu (sinon le dashboard s'ouvrait sur « 0 crédits »).
    window.location.assign("/dashboard")
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-strong">
        {t("signupTitle")}
      </h1>
      <p className="mt-1.5 text-sm text-muted">{t("signupSubtitle")}</p>

      <div className="mt-5">
        <GoogleButton label={t("google")} />
      </div>
      <div className="my-5 flex items-center gap-3 text-2xs font-medium text-muted-soft">
        <span className="h-px flex-1 bg-line" />
        {t("or")}
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="space-y-3.5">
        <TextField
          label={t("name")}
          registration={register("name")}
          error={errKey("name")}
          autoFocus
        />
        <TextField
          label={t("email")}
          type="email"
          registration={register("email")}
          error={errKey("email")}
        />
        <TextField
          label={t("password")}
          type="password"
          registration={register("password")}
          error={errKey("password")}
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
        {t("signupCta")}
      </Button>

      <p className="mt-4 text-center text-xs text-muted">
        {t("hasAccount")}{" "}
        <Link href="/login" className="font-semibold text-pine hover:underline">
          {t("loginLink")}
        </Link>
      </p>
    </form>
  )
}
