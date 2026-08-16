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
import { loginSchema, type LoginValues } from "./schemas"

export function LoginForm() {
  const t = useTranslations("auth")
  const [authError, setAuthError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  })

  const submit = async ({ email, password }: LoginValues) => {
    setAuthError(null)
    setPending(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      setAuthError(t("authErrorInvalid"))
      setPending(false)
      return
    }
    // Le proxy passe ?redirect=<path complet avec locale> — lu côté client au
    // submit (évite useSearchParams + son bailout SSR). On retire le préfixe de
    // locale pour le router next-intl (qui le rajoute).
    const raw =
      new URLSearchParams(window.location.search).get("redirect") ?? ""
    // Cible non localisée (ex. /api/oauth/authorize, flow OAuth MCP) → navigation
    // dure : le router i18n préfixerait la locale et casserait l'endpoint.
    if (raw.startsWith("/api/")) {
      window.location.assign(raw)
      return
    }
    const dest = raw.replace(/^\/(fr|en|es|pt)(?=\/|$)/, "") || "/dashboard"
    // Navigation DURE ici aussi : même raison que sur l'inscription (cf.
    // signup-form). `router.push` + `router.refresh()` envoie la requête RSC
    // avant que le serveur ne voie le cookie de session fraîchement écrit, et le
    // refresh annule la navigation en vol. Le symptôme est plus rare qu'à
    // l'inscription, mais c'est le même défaut — et le chemin de reconnexion
    // doit être sûr.
    window.location.assign(dest.startsWith("/") ? dest : "/dashboard")
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-strong">
        {t("loginTitle")}
      </h1>
      <p className="mt-1.5 text-sm text-muted">{t("loginSubtitle")}</p>

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
          label={t("email")}
          type="email"
          registration={register("email")}
          error={errors.email ? t("authErrorEmail") : undefined}
          autoFocus
        />
        <TextField
          label={t("password")}
          type="password"
          registration={register("password")}
          error={errors.password ? t("authErrorRequired") : undefined}
        />
      </div>

      <p className="mt-2.5 text-right">
        <Link
          href="/mot-de-passe-oublie"
          className="text-xs font-medium text-muted underline-offset-4 hover:text-pine hover:underline"
        >
          {t("forgotLink")}
        </Link>
      </p>

      {authError ? (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger"
        >
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
        {pending ? t("loginPending") : t("loginCta")}
      </Button>

      <p className="mt-4 text-center text-xs text-muted">
        {t("noAccount")}{" "}
        <Link
          href="/signup"
          className="font-semibold text-pine hover:underline"
        >
          {t("signupLink")}
        </Link>
      </p>
    </form>
  )
}
