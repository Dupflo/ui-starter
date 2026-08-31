import "server-only"
import type { User } from "@supabase/supabase-js"
import type { Database } from "@/database.types"

/**
 * T2 (s11-demo-mode) — demo fixtures. Typed with `Database` so the compiler
 * checks them against the real schema (never hand-rolled shapes that could
 * drift from the migrations).
 *
 * The demo user satisfies Supabase's `User` type IN FULL, not a subset:
 * `app/[locale]/(app)/layout.tsx` and the settings screen read `email` and
 * `user_metadata` off it.
 */

export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001"

/**
 * Builds a demo `User` for a given identity. Used both for the default demo
 * session (lib/demo/state.ts) and for the "log in as any email" journey
 * (AC: "connexion (n'importe quel email)").
 */
export function buildDemoUser(email: string, fullName: string): User {
  const now = new Date().toISOString()
  return {
    id: DEMO_USER_ID,
    aud: "authenticated",
    app_metadata: { provider: "demo" },
    user_metadata: { full_name: fullName, name: fullName },
    email,
    created_at: now,
    confirmed_at: now,
    email_confirmed_at: now,
    last_sign_in_at: now,
    updated_at: now,
    role: "authenticated",
    // No password identity — mirrors a Google-only account so
    // `changePassword`'s existing "no_password_account" branch applies as-is
    // in demo mode without a demo-specific reason on the wire type.
    identities: [],
  }
}

export const DEMO_PROFILE: Database["public"]["Tables"]["profiles"]["Row"] = {
  id: DEMO_USER_ID,
  created_at: new Date().toISOString(),
  display_name: "Alex Démo",
  avatar_url: null,
  role: "admin",
}

export const DEMO_SUBSCRIPTION: Database["public"]["Tables"]["subscriptions"]["Row"] =
  {
    user_id: DEMO_USER_ID,
    stripe_customer_id: "cus_demo",
    stripe_subscription_id: "sub_demo",
    status: "active",
    plan: "pro",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
