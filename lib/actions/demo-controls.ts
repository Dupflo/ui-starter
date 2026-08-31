"use server"

import { isDemoMode } from "@/lib/demo/flag"
import {
  demoSignIn,
  setDemoRole,
  setDemoSubscriptionActive,
  resetDemoSession,
  type DemoRole,
} from "@/lib/demo/state"

/**
 * T6 (s11-demo-mode) — server actions backing the demo banner controls
 * (`components/demo/*`): "connexion (n'importe quel email)", role switch
 * `user`↔`admin`, simulated subscribe/unsubscribe.
 *
 * These operations exist ONLY for the demo — there is no real-path branch to
 * fall back to, so each one is fail-closed on `isDemoMode()` itself: a no-op
 * outside demo mode, so calling one on a real deployment (however that would
 * happen) mutates nothing.
 */

export type DemoActionResult = { ok: true } | { ok: false; error: "not_demo" }

export async function demoLoginAction(
  email: string,
): Promise<DemoActionResult> {
  if (!isDemoMode()) return { ok: false, error: "not_demo" }
  await demoSignIn(email)
  return { ok: true }
}

export async function demoSetRoleAction(
  role: DemoRole,
): Promise<DemoActionResult> {
  if (!isDemoMode()) return { ok: false, error: "not_demo" }
  await setDemoRole(role)
  return { ok: true }
}

export async function demoSetSubscriptionAction(
  active: boolean,
): Promise<DemoActionResult> {
  if (!isDemoMode()) return { ok: false, error: "not_demo" }
  await setDemoSubscriptionActive(active)
  return { ok: true }
}

/**
 * Fix (s11-demo-mode review, major) — explicit reset control backing the
 * banner's "Réinitialiser" button. Clears the demo session cookie so the
 * next request falls back to the default fixtures (demo@example.com, Alex
 * Démo, admin, active subscription) — see lib/demo/state.ts's
 * resetDemoSession() for why deleting rather than overwriting.
 */
export async function demoResetAction(): Promise<DemoActionResult> {
  if (!isDemoMode()) return { ok: false, error: "not_demo" }
  await resetDemoSession()
  return { ok: true }
}
