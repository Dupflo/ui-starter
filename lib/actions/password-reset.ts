"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * « Mot de passe oublié ». Le lien de réinitialisation est émis et envoyé par
 * Supabase (`resetPasswordForEmail`) — le baseline n'embarque pas de fournisseur
 * d'e-mail transactionnel tiers. Le lien atterrit sur `/api/auth/callback`, qui
 * pose la session puis redirige vers l'écran « nouveau mot de passe ».
 *
 * SÉCURITÉ — la réponse est TOUJOURS `ok`, que le compte existe ou non. Répondre
 * « e-mail inconnu » transformerait ce formulaire en énumérateur de comptes. Le
 * silence est la fonctionnalité.
 */
export async function requestPasswordReset(
  email: string,
): Promise<{ ok: true }> {
  const clean = email.trim().toLowerCase()
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "")
  if (!clean) return { ok: true }

  try {
    const supabase = await createClient()
    await supabase.auth.resetPasswordForEmail(clean, {
      redirectTo: base
        ? `${base}/api/auth/callback?next=/nouveau-mot-de-passe`
        : undefined,
    })
  } catch {
    // Aucune erreur ne remonte à l'appelant (anti-énumération).
  }
  return { ok: true }
}
