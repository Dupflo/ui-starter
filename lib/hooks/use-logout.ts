"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { signOutAction } from "@/lib/actions/sign-out"

/**
 * Déconnexion. Partagé par la sidebar et les réglages — les deux boutons se
 * contentaient d'une navigation vers /login SANS `signOut()` : la session
 * Supabase restait valide, le proxy renvoyait aussitôt dans l'app, et le bouton
 * semblait ne rien faire.
 *
 * Le `signOut()` client seul ne suffisait pas non plus : quand il échoue (réseau,
 * refresh token expiré), le cookie de session RESTE, le proxy voit une session
 * valide et renvoie dans l'app — même symptôme, bouton mort. On appelle donc
 * AUSSI l'action serveur, qui purge le cookie via le client SSR quoi qu'il
 * arrive. Ceinture (client, vide le storage local) et bretelles (serveur, vide
 * le cookie qui fait foi pour le proxy).
 *
 * `window.location` plutôt que le router next-intl : on force un rechargement
 * complet pour repartir d'un état vierge. Un `router.push` garderait le cache
 * React (crédits, profil) du compte précédent — sur un poste partagé, ça
 * afficherait les données de quelqu'un d'autre le temps d'un revalidate.
 */
export function useLogout() {
  const [signingOut, setSigningOut] = useState(false)

  const logout = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await createClient().auth.signOut()
    } catch {
      // Réseau coupé ou session déjà expirée : on sort quand même. Rester
      // coincé dans l'app parce que le signOut a échoué serait pire.
    }
    try {
      // Le cookie fait foi pour le proxy : c'est CETTE purge qui décide.
      await signOutAction()
    } catch {}
    window.location.assign("/login")
  }

  return { logout, signingOut }
}
