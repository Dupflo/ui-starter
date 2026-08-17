"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { readConsent, writeConsent, CONSENT_EVENT } from "@/lib/consent"

/**
 * Bandeau de consentement (RGPD/CNIL). Cette app utilise des cookies de mesure
 * d'audience (Google Analytics via GTM, Microsoft Clarity) chargés UNIQUEMENT
 * après acceptation. Refus aussi simple qu'accepter (deux boutons équivalents),
 * cookies nécessaires toujours actifs. Le choix est mémorisé 12 mois.
 */
export function CookieBanner() {
  const t = useTranslations("cookieBanner")
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Affiché tant qu'aucun choix n'a été fait (lu après hydratation).
    if (readConsent() === null) setVisible(true)
    const onConsent = () => setVisible(false)
    window.addEventListener(CONSENT_EVENT, onConsent)
    return () => window.removeEventListener(CONSENT_EVENT, onConsent)
  }, [])

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label={t("aria")}
      className="light-scope fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl rounded-2xl border border-paper/10 bg-pine-900 p-4 shadow-float sm:inset-x-auto sm:left-1/2 sm:w-[min(48rem,calc(100vw-1.5rem))] sm:-translate-x-1/2"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-paper/80">
          {t.rich("body", {
            a: (c) => (
              <Link
                href="/cookies"
                className="font-semibold text-lime underline underline-offset-2 hover:text-lime/80"
              >
                {c}
              </Link>
            ),
          })}
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => writeConsent("denied")}
            className="rounded-lg border border-paper/25 px-4 py-2 text-xs font-semibold text-paper transition-colors hover:border-paper/50"
          >
            {t("refuse")}
          </button>
          <button
            type="button"
            onClick={() => writeConsent("granted")}
            className="rounded-lg bg-lime px-4 py-2 text-xs font-semibold text-pine transition-colors hover:bg-lime/90"
          >
            {t("accept")}
          </button>
        </div>
      </div>
    </div>
  )
}
