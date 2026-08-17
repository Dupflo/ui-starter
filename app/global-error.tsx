"use client"

import { useEffect } from "react"

/**
 * Dernier filet côté client — capture une erreur de rendu React que même le
 * layout localisé n'a pu contenir. Remplaçant complet du document (html/body),
 * donc styles inline et texte FR (hors provider next-intl). Remonte l'erreur au
 * MÊME canal (/api/log → reportError) avant d'afficher le repli.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    try {
      void fetch("/api/log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: error.message || "Erreur de rendu",
          stack: error.stack,
          digest: error.digest,
          route:
            typeof window !== "undefined"
              ? window.location.pathname
              : undefined,
        }),
        keepalive: true,
      })
    } catch {
      // ne jamais casser le repli pour une remontée d'erreur
    }
  }, [error])

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#10301E",
          color: "#F5F5F0",
          fontFamily: "system-ui, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 440, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, marginBottom: 12 }}>
            Une erreur est survenue
          </h1>
          <p style={{ opacity: 0.8, lineHeight: 1.6, marginBottom: 24 }}>
            Le souci a été signalé automatiquement à l&apos;équipe. Vous pouvez
            réessayer — vos données ne sont pas perdues.
          </p>
          <button
            onClick={reset}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "12px 24px",
              background: "#C5F24D",
              color: "#10301E",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}
