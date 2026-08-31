import "server-only"
import { createClient } from "@/lib/supabase/server"
import { isDemoMode } from "@/lib/demo/flag"
import { getDemoDisplayName } from "@/lib/demo/state"

export interface DashboardData {
  displayName: string
}

/**
 * Données du dashboard neutre : uniquement le nom affiché du profil connecté.
 * La vraie page (stats, contenu métier) est construite dans une story ultérieure.
 *
 * s11-demo-mode (T4) : en mode démo, retourne l'état en mémoire sans jamais
 * appeler Supabase.
 */
export async function loadDashboard(userId: string): Promise<DashboardData> {
  if (isDemoMode()) return { displayName: await getDemoDisplayName() }

  const supabase = await createClient()
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle()

  return {
    displayName: (data?.display_name as string | null)?.trim() || "",
  }
}
