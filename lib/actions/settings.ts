"use server"

import { createClient, getUser } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { reportError } from "@/lib/observability"
import { isDemoMode } from "@/lib/demo/flag"
import { setDemoDisplayName, demoSignOut } from "@/lib/demo/state"

/**
 * Actions de la page Réglages.
 *
 * L'auth vient toujours de la session (getUser) ; aucun userId n'est accepté en
 * argument. L'écriture profil est un upsert Supabase direct sur `profiles`
 * (baseline neutre : `display_name`, `avatar_url`).
 */

export type ProfileResult = { ok: true } | { ok: false; error: string }

export async function updateSettingsProfile(input: {
  fullName: string
}): Promise<ProfileResult> {
  const user = await getUser()
  if (!user) return { ok: false, error: "unauthenticated" }

  // s11-demo-mode (T4) : édite l'état en mémoire, jamais Supabase.
  if (isDemoMode()) {
    await setDemoDisplayName(input.fullName.trim())
    return { ok: true }
  }

  try {
    const supabase = await createClient()
    const displayName = input.fullName.trim()
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name: displayName || null } as never, {
        onConflict: "id",
      })
    if (error) {
      void reportError(error, {
        route: "settings/updateProfile",
        userId: user.id,
      })
      return { ok: false, error: "failed" }
    }
    return { ok: true }
  } catch (error) {
    void reportError(error, {
      route: "settings/updateProfile",
      userId: user.id,
    })
    return { ok: false, error: "failed" }
  }
}

export type PasswordResult =
  | { ok: true }
  | { ok: false; reason: "wrong_current" | "no_password_account" | "failed" }

/**
 * Change le mot de passe. Supabase autorise `updateUser({ password })` sur une
 * session valide SANS redemander l'actuel — on le vérifie quand même par une
 * ré-authentification : sinon une session laissée ouverte suffirait à changer
 * le mot de passe, et le champ « mot de passe actuel » du formulaire mentirait.
 */
export async function changePassword(input: {
  current: string
  next: string
}): Promise<PasswordResult> {
  const user = await getUser()
  if (!user?.email) return { ok: false, reason: "failed" }

  // s11-demo-mode (T4) : le compte démo n'a pas de mot de passe réel à
  // changer — même message/branche qu'un compte Google-only (trap: refuser
  // avec un message honnête plutôt que prétendre réussir contre rien).
  if (isDemoMode()) return { ok: false, reason: "no_password_account" }

  // Compte créé via Google seul : aucun mot de passe à remplacer.
  const hasPassword = (user.identities ?? []).some(
    (i) => i.provider === "email",
  )
  if (!hasPassword) return { ok: false, reason: "no_password_account" }

  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: input.current,
  })
  if (signInError) return { ok: false, reason: "wrong_current" }

  const { error } = await supabase.auth.updateUser({ password: input.next })
  if (error) {
    void reportError(error, {
      route: "settings/changePassword",
      userId: user.id,
    })
    return { ok: false, reason: "failed" }
  }
  return { ok: true }
}

/**
 * Suppression définitive du compte (RGPD, droit à l'effacement). Les tables
 * portant user_id sont en ON DELETE CASCADE : supprimer l'utilisateur auth
 * efface le profil.
 *
 * Irréversible. L'appelant DOIT avoir confirmé côté UI ; on revérifie ici que
 * l'utilisateur retape son adresse e-mail, pour qu'un clic accidentel ne suffise
 * jamais.
 */
export async function deleteAccount(input: {
  confirmEmail: string
}): Promise<{ ok: boolean; reason?: "email_mismatch" | "failed" }> {
  const user = await getUser()
  if (!user?.email) return { ok: false, reason: "failed" }
  if (input.confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
    return { ok: false, reason: "email_mismatch" }
  }

  // s11-demo-mode (T4) : rien à supprimer réellement — l'effacement se
  // matérialise en déconnectant l'utilisateur démo (trap: mutation visible
  // plutôt qu'un succès simulé contre rien).
  if (isDemoMode()) {
    await demoSignOut()
    return { ok: true }
  }

  const service = createServiceRoleClient()
  const { error } = await service.auth.admin.deleteUser(user.id)
  if (error) {
    void reportError(error, {
      route: "settings/deleteAccount",
      userId: user.id,
    })
    return { ok: false, reason: "failed" }
  }

  // La session est morte avec l'utilisateur ; on purge le cookie côté serveur.
  const supabase = await createClient()
  await supabase.auth.signOut()
  return { ok: true }
}
