// Next 16 : onRequestError capture TOUTES les erreurs serveur NON RATTRAPÉES
// (route handlers, server actions, RSC) → reportError (Discord, prod uniquement).
// Les erreurs RATTRAPÉES (401/402/502 externes renvoyés en réponse propre)
// n'atteignent pas ce hook : elles appellent reportError explicitement dans leur
// `catch`. Un seul point de traçabilité, sans toucher chaque console.error.
import type { Instrumentation } from "next"

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context,
) => {
  const { reportError } = await import("@/lib/observability")
  await reportError(err, {
    source: "server",
    route: context?.routePath || request?.path,
    method: request?.method,
  })
}
