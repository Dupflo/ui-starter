"use client"

import { useEffect } from "react"
import { readConsent, CONSENT_EVENT } from "@/lib/consent"

// IDs fournis via l'env (publics par nature). Absents = rien ne se charge (dev/CI).
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID

let injected = false

/** Injecte GTM (→ Google Analytics) + Microsoft Clarity une seule fois. */
function injectTrackers() {
  if (injected || typeof window === "undefined") return
  injected = true

  if (GTM_ID) {
    const w = window as unknown as { dataLayer?: unknown[] }
    w.dataLayer = w.dataLayer || []
    w.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" })
    const s = document.createElement("script")
    s.async = true
    s.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`
    document.head.appendChild(s)
  }

  if (CLARITY_ID) {
    const c = window as unknown as {
      clarity?: ((...args: unknown[]) => void) & { q?: unknown[] }
    }
    c.clarity =
      c.clarity ||
      function (...args: unknown[]) {
        ;(c.clarity!.q = c.clarity!.q || []).push(args)
      }
    const s = document.createElement("script")
    s.async = true
    s.src = `https://www.clarity.ms/tag/${CLARITY_ID}`
    document.head.appendChild(s)
  }
}

/**
 * Charge la mesure d'audience UNIQUEMENT après consentement (opt-in RGPD).
 * Écoute l'événement de consentement pour s'activer sans rechargement.
 */
export function Analytics() {
  useEffect(() => {
    if (readConsent() === "granted") injectTrackers()
    const onConsent = (e: Event) => {
      if ((e as CustomEvent).detail === "granted") injectTrackers()
    }
    window.addEventListener(CONSENT_EVENT, onConsent)
    return () => window.removeEventListener(CONSENT_EVENT, onConsent)
  }, [])
  return null
}
