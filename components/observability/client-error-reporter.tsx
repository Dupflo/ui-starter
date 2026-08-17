"use client"

import { useEffect } from "react"

/**
 * Capture GLOBALE des erreurs client — erreurs JS non rattrapées (window.onerror)
 * et promesses rejetées (unhandledrejection) → POST /api/log → même canal d'alerte
 * que le serveur. Un seul composant monté à la racine ; aucun try/catch à semer
 * dans les composants.
 *
 * Dédup côté client (fenêtre courte) pour ne pas marteler /api/log si une erreur
 * boucle dans un rendu ; la dédup serveur reste le garde-fou final.
 */
const CLIENT_WINDOW_MS = 30_000
const recent = new Map<string, number>()

function post(message: string, stack?: string) {
  if (!message) return
  const key = message.slice(0, 200)
  const now = Date.now()
  const last = recent.get(key)
  if (last && now - last < CLIENT_WINDOW_MS) return
  recent.set(key, now)
  // keepalive : part même si la page se ferme juste après l'erreur.
  try {
    void fetch("/api/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message,
        stack,
        route: window.location.pathname,
      }),
      keepalive: true,
    })
  } catch {
    // ne jamais casser la page pour une remontée d'erreur
  }
}

export function ClientErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      post(e.message || "Erreur JS", e.error?.stack)
    }
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason
      if (r instanceof Error) post(r.message, r.stack)
      else post(typeof r === "string" ? r : "Rejet de promesse non géré")
    }
    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onRejection)
    return () => {
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onRejection)
    }
  }, [])
  return null
}
