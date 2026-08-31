import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/database.types"
import { isDemoMode } from "@/lib/demo/flag"
import { getDemoUser } from "@/lib/demo/state"

/** Client Supabase côté serveur (Server Components, Server Actions, Route Handlers). */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // setAll appelé depuis un Server Component : ignorable tant que le
            // proxy (middleware) rafraîchit la session côté requête.
          }
        },
      },
    },
  )
}

/**
 * Utilisateur connecté côté serveur, ou null.
 *
 * s11-demo-mode (T4) : en mode démo, l'identité vient de l'état en mémoire
 * (`lib/demo/state.ts`) — le client Supabase réel n'est jamais construit ni
 * appelé. `isDemoMode()` est fail-closed (lib/demo/flag.ts) : hors démo, ce
 * chemin est un pur no-op et le comportement ci-dessous est inchangé.
 */
export async function getUser() {
  if (isDemoMode()) return getDemoUser()

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}
