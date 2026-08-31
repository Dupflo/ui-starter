import "server-only"
import { createClient } from "@/lib/supabase/server"
import { isDemoMode } from "@/lib/demo/flag"
import { getDemoSubscriptionStatus } from "@/lib/demo/state"

/**
 * Lit l'abonnement d'un utilisateur depuis la table `subscriptions`.
 *
 * Miroir exact de `getRole` (`lib/data/identity.ts:55-63`) : lecture server-side,
 * clé de conflit = user_id, retour null si absent (fail-safe).
 *
 * L'appelant dérive userId de `getUser()` côté serveur — jamais passé depuis le client.
 *
 * s11-demo-mode (T4) : en mode démo, retourne l'état en mémoire (plan fixe
 * "pro", seul plan du starter — lib/stripe/config.ts) sans jamais appeler
 * Supabase.
 */
export async function getSubscription(
  userId: string,
): Promise<{ status: string; plan: string | null } | null> {
  if (isDemoMode())
    return { status: await getDemoSubscriptionStatus(), plan: "pro" }

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
