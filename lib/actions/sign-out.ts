"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * Déconnexion côté SERVEUR — c'est elle qui fait autorité.
 *
 * Le `signOut()` client ne suffit pas : s'il échoue (réseau coupé, refresh token
 * déjà expiré côté Supabase), le cookie de session reste posé. Le proxy voit
 * alors une session valide et renvoie aussitôt dans l'app → le bouton semble ne
 * rien faire. Ici, le client SSR écrit dans le cookie store : la session est
 * effacée du navigateur même si l'appel de révocation à Supabase échoue.
 *
 * `scope: "local"` : on veut d'abord garantir que CE navigateur est déconnecté.
 * Une révocation globale qui échoue ne doit pas laisser l'utilisateur connecté
 * sur la machine devant laquelle il est en train de partir.
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient()
  try {
    await supabase.auth.signOut({ scope: "local" })
  } catch {
    // Le cookie a été purgé par le client SSR : la déconnexion locale tient,
    // quoi qu'ait répondu Supabase.
  }
}
