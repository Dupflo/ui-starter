import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

/**
 * Garantit qu'une ligne `profiles` existe pour cet utilisateur.
 *
 * Idempotent : la clé primaire `profiles.id` (= `auth.users.id`) empêche tout
 * doublon ; `ignoreDuplicates` fait un `do nothing` (le nom ne sert qu'à
 * l'insertion initiale, jamais à écraser un profil existant).
 *
 * Service-role assumé : on provisionne un utilisateur qui n'a encore rien, donc
 * aucune politique RLS ne le laisserait écrire sa propre première ligne.
 */
export async function ensureProfile(
  userId: string,
  meta: { fullName?: string | null } = {},
): Promise<void> {
  const displayName = (meta.fullName ?? "").trim() || null

  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, display_name: displayName } as never, {
      onConflict: "id",
      ignoreDuplicates: true,
    })

  // Best-effort : ne jamais empêcher l'entrée dans l'app. Un profil manquant se
  // rattrape au prochain chargement ; une page blanche, non.
  if (error) console.error("[ensureProfile]", error.message)
}
