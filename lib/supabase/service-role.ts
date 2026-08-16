import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/database.types"

/**
 * Client Supabase avec la clé service role (contourne RLS). SERVER-ONLY.
 * Réservé aux chemins de confiance (webhooks Stripe, RPC crédits, jobs). Ne jamais
 * importer depuis un Client Component.
 */
export function createServiceRoleClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquant (requis pour les opérations service role).",
    )
  }
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
  )
}
