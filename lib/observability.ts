import "server-only"

/**
 * Point d'entrée UNIQUE de la traçabilité d'erreurs — `reportError(err, ctx)`.
 *
 * Objectif : une seule fonction, posée aux frontières (voir `instrumentation.ts`
 * pour le serveur non-rattrapé, les `catch` de routes pour le rattrapé, et
 * `/api/log` pour le client). On ne loggue PAS à chaque appel : on rapporte là
 * où une erreur naît réellement, sans dupliquer de code de log partout.
 *
 * Baseline neutre : le rapport se contente d'un log serveur (prod). Le canal
 * d'alerte réel (Discord/Sentry) est une décision produit ultérieure ; ici on
 * garde la frontière stable sans dépendance externe.
 */

export type ErrorSource = "server" | "client" | "external"

export type ErrorContext = {
  /** Route ou chemin logique où l'erreur survient (ex. "/api/webhooks/stripe"). */
  route?: string
  method?: string
  /** Utilisateur concerné, pour reproduire côté support. */
  userId?: string
  /** D'où vient l'erreur : serveur (rattrapé/non), client, service externe. */
  source?: ErrorSource
  /** Service externe en cause, le cas échéant (stripe…). */
  service?: string
  /** Code HTTP renvoyé/reçu, s'il existe. */
  status?: number
  /** Digest Next (client) ou toute autre info courte utile. */
  extra?: Record<string, string | number | undefined>
}

type NormalizedError = { message: string; stack?: string }

function normalizeError(err: unknown): NormalizedError {
  if (err instanceof Error) return { message: err.message, stack: err.stack }
  if (typeof err === "string") return { message: err }
  // Objet en forme d'erreur ({ message, stack }) — cas du puits client /api/log
  // et de certains rejets non-Error.
  if (err && typeof err === "object") {
    const o = err as { message?: unknown; stack?: unknown }
    if (typeof o.message === "string")
      return {
        message: o.message,
        stack: typeof o.stack === "string" ? o.stack : undefined,
      }
    try {
      return { message: JSON.stringify(err).slice(0, 500) }
    } catch {
      return { message: String(err) }
    }
  }
  return { message: String(err) }
}

/**
 * Rapporte une erreur (log serveur en prod). Ne throw jamais : la traçabilité
 * ne doit pas casser le chemin qui l'appelle.
 */
export async function reportError(
  err: unknown,
  ctx: ErrorContext = {},
): Promise<void> {
  try {
    if (process.env.NODE_ENV !== "production") return
    const error = normalizeError(err)
    console.error("[reportError]", error.message, ctx)
  } catch {
    // fire-and-forget : jamais bruyant
  }
}
