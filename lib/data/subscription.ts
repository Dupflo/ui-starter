import "server-only"
import { createClient } from "@/lib/supabase/server"

/**
 * Lit l'abonnement d'un utilisateur depuis la table `subscriptions`.
 *
 * Miroir exact de `getRole` (`lib/data/identity.ts:55-63`) : lecture server-side,
 * clé de conflit = user_id, retour null si absent (fail-safe).
 *
 * L'appelant dérive userId de `getUser()` côté serveur — jamais passé depuis le client.
 */
export async function getSubscription(
  userId: string,
): Promise<{ status: string; plan: string | null } | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("subscriptions")
    .select("status, plan")
    .eq("user_id", userId)
    .maybeSingle()
  if (!data) return null
  return { status: data.status, plan: data.plan }
}

/**
 * Prédicat pur : `true` ssi le statut est `"active"`.
 *
 * Seul `"active"` passe le gate — `trialing`, `past_due`, `canceled` et tout
 * statut inconnu sont rejetés. Miroir de `isAdmin` (`identity.ts:71-73`).
 * Extrait pour être testable sans DOM runner.
 */
export function isActiveSubscriber(status: string | null | undefined): boolean {
  return status === "active"
}
