import { NextResponse, type NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * Point d'atterrissage unique de tous les liens d'authentification signés :
 * OAuth (Google), lien de secours « choisis ton mot de passe », réinitialisation.
 * Il n'en existait aucun — d'où l'impossibilité d'envoyer le moindre lien e-mail.
 *
 * Sous /api/ VOLONTAIREMENT : le proxy next-intl (matcher `(?!api|…)`) préfixerait
 * la locale et casserait l'URL de retour attendue par Supabase.
 *
 * Deux formes selon l'émetteur :
 *  - `code`       → OAuth / PKCE          → exchangeCodeForSession
 *  - `token_hash` → liens e-mail (recovery, invite…) → verifyOtp
 * Dans les deux cas : session posée en cookie, puis redirection vers `next`.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  // `next` ne doit JAMAIS pouvoir pointer ailleurs que sur notre domaine :
  // sinon le lien devient un open redirect qui promène l'utilisateur (et son
  // jeton) vers un site tiers. On n'accepte qu'un chemin absolu interne.
  const raw = searchParams.get("next") ?? "/dashboard"
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard"

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error("[auth/callback] échange du code:", error.message)
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    })
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    console.error("[auth/callback] verifyOtp:", error.message)
  }

  // Lien expiré, déjà consommé, ou trafiqué → on renvoie au login plutôt que sur
  // une page blanche.
  return NextResponse.redirect(`${origin}/login?error=link`)
}
