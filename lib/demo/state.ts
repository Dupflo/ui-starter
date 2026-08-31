import "server-only"
import type { User } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { buildDemoUser } from "./fixtures"
import {
  DEMO_SESSION_COOKIE,
  defaultDemoSession,
  parseDemoSession,
  serializeDemoSession,
  type DemoRole,
  type DemoSession,
  type DemoSubscriptionStatus,
} from "./session-cookie"

export type { DemoRole, DemoSubscriptionStatus }

/**
 * Fix (s11-demo-mode review, critical) — action/RSC side of the demo
 * session cookie (`lib/demo/session-cookie.ts` has the full rationale and
 * the codec). This module holds NO mutable state of its own anymore: every
 * getter/setter below reads or writes the `demo_session` cookie via
 * `next/headers`'s `cookies()`, which is why they are all `async` now (the
 * old T3 module-scoped `let state` version was synchronous — every caller
 * already `await`s these functions inside an async server action/RSC, so
 * the call sites didn't need to change).
 *
 * `proxy.ts` (middleware) reads the exact same cookie directly off
 * `request.cookies` via the pure codec in `session-cookie.ts` — it does
 * NOT import this module, because middleware and this module compile into
 * separate graphs and `next/headers`'s `cookies()` isn't the API
 * middleware uses anyway (`request.cookies` / `response.cookies` are).
 *
 * Not safe across multiple `next start` workers is no longer even the
 * caveat: cookies are the correct cross-request channel regardless of how
 * many worker processes serve a given request — the previous per-process
 * caveat applied to the module-scope design this replaces.
 */

const COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  httpOnly: true,
}

async function readSession(): Promise<DemoSession> {
  const store = await cookies()
  return parseDemoSession(store.get(DEMO_SESSION_COOKIE)?.value)
}

async function writeSession(session: DemoSession): Promise<void> {
  const store = await cookies()
  store.set(DEMO_SESSION_COOKIE, serializeDemoSession(session), COOKIE_OPTIONS)
}

export async function getDemoUser(): Promise<User | null> {
  const session = await readSession()
  if (session.email === null) return null
  return buildDemoUser(session.email, session.displayName)
}

export async function getDemoRole(): Promise<DemoRole> {
  return (await readSession()).role
}

export async function getDemoSubscriptionStatus(): Promise<DemoSubscriptionStatus> {
  return (await readSession()).subscriptionStatus
}

export async function getDemoDisplayName(): Promise<string> {
  return (await readSession()).displayName
}

/** "Connexion (n'importe quel email)" — no password check, any email works. */
export async function demoSignIn(email: string): Promise<User> {
  const trimmed = email.trim() || "demo@example.com"
  const localPart = trimmed.split("@")[0] || "Demo"
  const current = await readSession()
  const next: DemoSession = {
    ...current,
    email: trimmed,
    // The display name follows the login it names — otherwise the sidebar
    // shows the new email while the dashboard keeps greeting whoever was
    // signed in before.
    displayName: localPart,
  }
  await writeSession(next)
  return buildDemoUser(next.email as string, next.displayName)
}

export async function demoSignOut(): Promise<void> {
  const current = await readSession()
  await writeSession({ ...current, email: null })
}

export async function setDemoRole(role: DemoRole): Promise<void> {
  const current = await readSession()
  await writeSession({ ...current, role })
}

export async function setDemoSubscriptionActive(
  active: boolean,
): Promise<void> {
  const current = await readSession()
  await writeSession({
    ...current,
    subscriptionStatus: active ? "active" : "canceled",
  })
}

export async function setDemoDisplayName(name: string): Promise<void> {
  const current = await readSession()
  await writeSession({ ...current, displayName: name })
}

/**
 * Fix (s11-demo-mode review, major) — explicit reset control. The story's
 * original AC promised the demo state "resets on server restart"; moving the
 * session into a cookie (this file's own header comment) made that false —
 * the cookie survives a restart, by design, since it is what lets the
 * middleware and the server actions agree. The human decision (see
 * docs/plans/s11-demo-mode.md, T3 "Revised") was not to force a
 * reset-on-restart but to add this explicit control instead.
 *
 * Deletes the cookie rather than writing `defaultDemoSession()` into it:
 * `parseDemoSession` already treats a missing cookie as the default, so
 * deleting keeps that a single source of truth instead of two paths that
 * could drift.
 */
export async function resetDemoSession(): Promise<void> {
  const store = await cookies()
  store.delete(DEMO_SESSION_COOKIE)
}

// Exported for tests that need a known-default session shape without
// duplicating it (e.g. asserting against the fixture values).
export { defaultDemoSession }
