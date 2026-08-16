import { NextResponse, type NextRequest } from "next/server"
import { reportError } from "@/lib/observability"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Puits d'erreurs CLIENT — `client-error-reporter` et `global-error` POSTent ici
 * (window.onerror / unhandledrejection / erreur de rendu React). Converge vers le
 * MÊME `reportError` que le serveur : un seul canal d'alerte, dédup incluse.
 *
 * Route publique (le client non authentifié doit pouvoir remonter une erreur) :
 * on borne strictement les champs et on force `source: "client"`. La dédup de
 * reportError absorbe les rafales ; pas de secret ici (données déjà côté client).
 */
type Payload = {
  message?: unknown
  stack?: unknown
  route?: unknown
  digest?: unknown
}

const str = (v: unknown, max: number): string | undefined =>
  typeof v === "string" && v.trim() ? v.slice(0, max) : undefined

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Payload | null
  const message = str(body?.message, 1000)
  if (!message) return NextResponse.json({ ok: false }, { status: 400 })

  const stack = str(body?.stack, 2000)
  await reportError(stack ? { message, stack } : new Error(message), {
    source: "client",
    route: str(body?.route, 200),
    extra: { digest: str(body?.digest, 100) },
  })
  return NextResponse.json({ ok: true })
}
