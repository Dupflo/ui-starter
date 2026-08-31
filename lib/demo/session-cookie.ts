import { DEMO_PROFILE, DEMO_SUBSCRIPTION } from "./fixtures"

/**
 * Fix (s11-demo-mode review, critical) — the demo SESSION, as a cookie.
 *
 * Next compiles `proxy.ts` (middleware) and the server actions/RSC tree
 * into SEPARATE module graphs. The original T3 design (a module-scoped
 * `let state`) therefore existed as two independent copies: mutating it
 * from a server action (sign out, switch role…) was invisible to the
 * middleware, which kept enforcing the stale "still logged in" state —
 * signing out froze the demo (see the review for the reproduced A–E
 * sequence). A cookie is the only channel both sides read, because both
 * read it off the SAME HTTP request.
 *
 * This is a demo fixture, not a session system: the cookie is a bare JSON
 * blob, UNSIGNED and UNENCRYPTED. There is nothing worth protecting from
 * tampering — it carries no real identity, only an email string typed in a
 * form, a role, a subscription flag and a display name, all of it already
 * fully attacker-controlled via the demo actions themselves. Reading it is
 * gated behind `isDemoMode()` everywhere, exactly like the other 13 seams
 * (`lib/demo/flag.ts`) — this module holds no mutable state of its own, it
 * is a pure codec shared by:
 *   - `proxy.ts` (middleware), which reads it synchronously off
 *     `request.cookies` — it never writes it, only decides ON/redirect.
 *   - `lib/demo/state.ts` (actions/RSC), which reads and writes it via
 *     `next/headers`'s `cookies()`.
 *
 * `email: null` is the ONLY signed-out representation — `role`,
 * `subscriptionStatus` and `displayName` are independent of it (mirrors
 * the original module-scoped design: signing out only clears the current
 * user, a role/subscription flip while signed out still "sticks" for the
 * next sign-in, exactly as it did before).
 */

export const DEMO_SESSION_COOKIE = "demo_session"

export type DemoRole = "user" | "admin"
export type DemoSubscriptionStatus = "active" | "canceled"

export type DemoSession = {
  email: string | null
  role: DemoRole
  subscriptionStatus: DemoSubscriptionStatus
  displayName: string
}

/**
 * No cookie yet (a fresh visit) starts fully unlocked — the point of the
 * demo is to see the whole app immediately, before wiring a single key.
 * Mirrors `lib/demo/fixtures.ts`'s DEMO_PROFILE / DEMO_SUBSCRIPTION so the
 * default session and the static fixtures never drift apart.
 */
export function defaultDemoSession(): DemoSession {
  return {
    email: "demo@example.com",
    role: DEMO_PROFILE.role as DemoRole,
    subscriptionStatus: DEMO_SUBSCRIPTION.status as DemoSubscriptionStatus,
    displayName: DEMO_PROFILE.display_name ?? "Demo",
  }
}

function isValidSession(value: unknown): value is DemoSession {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    (typeof candidate.email === "string" || candidate.email === null) &&
    (candidate.role === "user" || candidate.role === "admin") &&
    (candidate.subscriptionStatus === "active" ||
      candidate.subscriptionStatus === "canceled") &&
    typeof candidate.displayName === "string"
  )
}

/**
 * Fail-closed: anything that isn't a recognizable session — no cookie, a
 * malformed value, a throw while parsing — resolves to the DEFAULT
 * (signed-in) session, never a crash.
 */
export function parseDemoSession(raw: string | undefined): DemoSession {
  if (!raw) return defaultDemoSession()
  try {
    const parsed: unknown = JSON.parse(raw)
    if (isValidSession(parsed)) return parsed
    return defaultDemoSession()
  } catch {
    return defaultDemoSession()
  }
}

export function serializeDemoSession(session: DemoSession): string {
  return JSON.stringify(session)
}
