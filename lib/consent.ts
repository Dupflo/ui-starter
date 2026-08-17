// Gestion du consentement à la mesure d'audience (Google Analytics via GTM,
// Microsoft Clarity). Opt-in RGPD/CNIL : aucun traceur n'est chargé tant que
// l'utilisateur n'a pas explicitement accepté. Choix mémorisé 12 mois.

export const CONSENT_COOKIE = "app_consent"
export const CONSENT_EVENT = "app:consent"
export type Consent = "granted" | "denied"

export function readConsent(): Consent | null {
  if (typeof document === "undefined") return null
  const m = document.cookie.match(/(?:^|;\s*)app_consent=(granted|denied)/)
  return m ? (m[1] as Consent) : null
}

export function writeConsent(value: Consent): void {
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }))
}

/** Réouvre le choix (ex. depuis la politique cookies). Recharge pour décharger
 *  d'éventuels traceurs déjà injectés lors d'une acceptation précédente. */
export function resetConsent(): void {
  document.cookie = `${CONSENT_COOKIE}=; path=/; max-age=0; samesite=lax`
  window.location.reload()
}
