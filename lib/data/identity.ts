import "server-only"
import { createClient } from "@/lib/supabase/server"
import { isDemoMode } from "@/lib/demo/flag"
import { getDemoRole, getDemoDisplayName } from "@/lib/demo/state"
import { DEMO_PROFILE } from "@/lib/demo/fixtures"

/**
 * Nom affiché dans le chrome de l'app (badge de la barre latérale).
 *
 * Ordre de priorité : le profil d'abord (`display_name`, édité depuis l'écran
 * Réglages), puis les métadonnées d'inscription, puis la partie locale de
 * l'e-mail. `null` seulement si on n'a strictement rien — l'appelant affiche
 * alors un libellé générique plutôt qu'une chaîne vide.
 */
export async function getDisplayName(
  userId: string,
  meta: { fullName?: string | null; email?: string | null },
): Promise<string | null> {
  if (isDemoMode()) return getDemoDisplayName()

  const supabase = await createClient()
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle()

  const fromProfile = (data?.display_name as string | null)?.trim()
  if (fromProfile) return fromProfile

  const fromMeta = meta.fullName?.trim()
  if (fromMeta) return fromMeta

  const local = meta.email?.split("@")[0]?.trim()
  return local || null
}

/**
 * URL publique de la photo de profil (colonne `profiles.avatar_url`), affichée
 * dans l'avatar de la sidebar quand elle existe — sinon on retombe sur les
 * initiales.
 */
export async function getAvatarUrl(userId: string): Promise<string | null> {
  if (isDemoMode()) return DEMO_PROFILE.avatar_url ?? null

  const supabase = await createClient()
  const { data } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .maybeSingle()
  return (data?.avatar_url as string | null) ?? null
}

/**
 * Rôle de l'utilisateur (`user` ou `admin`), lu depuis `profiles.role`.
 *
 * Défaut fail-safe : retourne `"user"` si la ligne est absente ou si `role`
 * est null — jamais `admin` par défaut. L'appelant dérive `userId` de
 * `getUser()` côté serveur ; le gate de route est dans la page, pas ici.
 */
export async function getRole(userId: string): Promise<"user" | "admin"> {
  if (isDemoMode()) return getDemoRole()

  const supabase = await createClient()
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle()
  return (data?.role as "user" | "admin" | null | undefined) ?? "user"
}

/**
 * Prédicat pur : `true` ssi le rôle est `"admin"`.
 *
 * Extrait pour être testable sans DOM runner et pour garder le gate de la
 * page lisible : `if (!isAdmin(role)) notFound()`.
 */
export function isAdmin(role: "user" | "admin"): boolean {
  return role === "admin"
}

/**
 * Initiales du badge rond. Deux lettres au plus, à partir des deux premiers
 * mots ; repli sur les deux premières lettres d'un nom en un seul mot.
 */
export function initialsOf(name: string | null): string {
  if (!name) return "?"
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}
