"use client"

import { resetConsent } from "@/lib/consent"

/** Réouvre le choix de consentement (le bandeau réapparaît après rechargement). */
export function ConsentResetButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={resetConsent}
      className="mt-3 inline-flex rounded-lg border border-line bg-fill px-4 py-2 text-xs font-semibold text-ink transition-colors hover:border-pine hover:text-pine"
    >
      {label}
    </button>
  )
}
