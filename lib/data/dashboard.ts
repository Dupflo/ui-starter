import "server-only"
import { createClient } from "@/lib/supabase/server"

export interface DashboardData {
  displayName: string
}

/**
 * Données du dashboard neutre : uniquement le nom affiché du profil connecté.
 * La vraie page (stats, contenu métier) est construite dans une story ultérieure.
 */
export async function loadDashboard(userId: string): Promise<DashboardData> {
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
