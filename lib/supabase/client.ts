"use client"

import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/database.types"

/** Client Supabase côté navigateur (Client Components). Gère les cookies de session. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
