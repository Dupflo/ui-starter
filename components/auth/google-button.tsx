"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

/**
 * « Continuer avec Google ». Le bouton était purement décoratif (« no real OAuth
 * in this prototype ») : il ne faisait rien.
 *
 * Flux : Supabase redirige vers Google, Google revient sur Supabase, qui renvoie
 * sur /api/auth/callback avec un `code` échangé contre une session (cf. la route).
 * `redirectTo` est construit sur l'origine COURANTE → le flux marche aussi en
 * local sans dépendre de NEXT_PUBLIC_APP_URL.
 *
 * `next` propage la cible d'origine (le proxy la passe en ?redirect=) : on ne
 * ramène pas au dashboard quelqu'un qui visait une page précise. La route
 * contraint ce paramètre aux chemins internes — pas d'open redirect.
 */
export function GoogleButton({ label }: { label: string }) {
  const [pending, setPending] = useState(false)

  const signIn = async () => {
    if (pending) return
    setPending(true)
    const raw = new URLSearchParams(window.location.search).get("redirect")
    const next = raw?.startsWith("/") && !raw.startsWith("//") ? raw : null
    const callback = new URL("/api/auth/callback", window.location.origin)
    if (next) callback.searchParams.set("next", next)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString() },
    })
    // Succès = redirection vers Google, on ne repasse jamais ici. Une erreur
    // (provider non configuré côté Supabase) doit donc réarmer le bouton.
    if (error) {
      console.error("[google] signInWithOAuth:", error.message)
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={signIn}
      disabled={pending}
      className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-white text-sm font-semibold text-ink-strong transition-colors hover:bg-fill disabled:opacity-70"
    >
      <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.8-2 5.1-4.4 6.7v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.2z"
        />
        <path
          fill="#34A853"
          d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.1 15.4 46 24 46z"
        />
        <path
          fill="#FBBC05"
          d="M11.8 28.3c-.4-1.3-.7-2.7-.7-4.3s.2-3 .7-4.3v-5.7H4.5C3 17 2.1 20.4 2.1 24s.9 7 2.4 10l7.3-5.7z"
        />
        <path
          fill="#EA4335"
          d="M24 9.5c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 3 29.9 1 24 1 15.4 1 8.1 5.9 4.5 13l7.3 5.7c1.7-5.2 6.5-9.2 12.2-9.2z"
        />
      </svg>
      {label}
    </button>
  )
}
