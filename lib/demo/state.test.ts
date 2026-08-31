import { describe, it, expect, beforeEach, vi } from "vitest"

// Fix (s11-demo-mode review, critical) — the demo session now lives in a
// cookie (lib/demo/session-cookie.ts), read/written here via `next/headers`
// `cookies()` so both server actions and RSC see the SAME state a browser
// would present back on the next request. `next/headers` is mocked because
// vitest runs outside a Next request scope (an unrelated harness reason —
// `cookies()` throws there for real) — the fake below is a faithful
// get/set jar, not a mock of anything this file is supposed to prove.

let jar: Map<string, string>
// Fix (s11-demo-mode review, major) — the previous fake `set(name, value)`
// silently dropped the cookie options argument, so a regression on
// `httpOnly`/`sameSite`/`path` in COOKIE_OPTIONS could never fail here.
// Captured below so a test can assert on it.
let lastSetOptions: Record<string, unknown> | undefined

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = jar.get(name)
      return value === undefined ? undefined : { name, value }
    },
    set: (name: string, value: string, options?: Record<string, unknown>) => {
      jar.set(name, value)
      lastSetOptions = options
    },
    delete: (name: string) => {
      jar.delete(name)
    },
  }),
}))

import {
  getDemoUser,
  getDemoRole,
  getDemoSubscriptionStatus,
  getDemoDisplayName,
  demoSignIn,
  demoSignOut,
  setDemoRole,
  setDemoSubscriptionActive,
  setDemoDisplayName,
  resetDemoSession,
} from "./state"
import {
  DEMO_SESSION_COOKIE,
  defaultDemoSession,
  parseDemoSession,
} from "./session-cookie"

describe("lib/demo/state.ts — demo session, cookie-backed", () => {
  beforeEach(() => {
    jar = new Map()
    lastSetOptions = undefined
  })

  it("writes the session cookie with path=/, sameSite=lax, httpOnly=true", async () => {
    await demoSignIn("visitor@example.com")
    expect(lastSetOptions).toEqual({
      path: "/",
      sameSite: "lax",
      httpOnly: true,
    })
  })

  it("starts with a default, already-authenticated demo user when no cookie exists (so every screen renders without a manual login step)", async () => {
    const user = await getDemoUser()
    expect(user).not.toBeNull()
    expect(user?.email).toBeTruthy()
  })

  it("starts with role 'admin' and an active subscription — the full app is visible out of the box", async () => {
    expect(await getDemoRole()).toBe("admin")
    expect(await getDemoSubscriptionStatus()).toBe("active")
  })

  it("demoSignIn(email) sets the current user to that email (any email accepted — no password check) and WRITES the cookie", async () => {
    const user = await demoSignIn("visitor@example.com")
    expect(user.email).toBe("visitor@example.com")
    expect((await getDemoUser())?.email).toBe("visitor@example.com")

    // The write must actually be on the wire — a fresh reader (the point of
    // the whole fix) must see it too, not just the same in-process getter.
    const cookieValue = jar.get(DEMO_SESSION_COOKIE)
    expect(cookieValue).toBeTruthy()
    expect(parseDemoSession(cookieValue).email).toBe("visitor@example.com")
  })

  it("demoSignIn(email) makes the display name follow the new login (regression: used to stay stuck on the previous name)", async () => {
    await demoSignIn("zoe@test.io")
    expect(await getDemoDisplayName()).toBe("zoe")
  })

  it("demoSignOut() clears the current user and WRITES an explicit signed-out cookie, but leaves role/subscription/displayName untouched", async () => {
    await demoSignIn("visitor@example.com")
    await setDemoRole("user")
    await demoSignOut()

    expect(await getDemoUser()).toBeNull()
    const parsed = parseDemoSession(jar.get(DEMO_SESSION_COOKIE))
    expect(parsed.email).toBeNull()
    expect(parsed.role).toBe("user")
  })

  it("setDemoRole toggles user <-> admin and persists across a fresh read of the cookie", async () => {
    await setDemoRole("user")
    expect(await getDemoRole()).toBe("user")
    expect(parseDemoSession(jar.get(DEMO_SESSION_COOKIE)).role).toBe("user")

    await setDemoRole("admin")
    expect(await getDemoRole()).toBe("admin")
  })

  it("setDemoSubscriptionActive flips the subscription gate and persists across a fresh read of the cookie", async () => {
    await setDemoSubscriptionActive(false)
    expect(await getDemoSubscriptionStatus()).toBe("canceled")
    expect(
      parseDemoSession(jar.get(DEMO_SESSION_COOKIE)).subscriptionStatus,
    ).toBe("canceled")

    await setDemoSubscriptionActive(true)
    expect(await getDemoSubscriptionStatus()).toBe("active")
  })

  it("setDemoDisplayName updates the displayed name", async () => {
    await setDemoDisplayName("Nouveau Nom")
    expect(await getDemoDisplayName()).toBe("Nouveau Nom")
  })

  it("mutating role while signed out does not sign the user back in", async () => {
    await demoSignOut()
    await setDemoRole("user")
    expect(await getDemoUser()).toBeNull()
    expect(await getDemoRole()).toBe("user")
  })

  it("resetDemoSession() deletes the cookie, so the next read is byte-identical to a first visit", async () => {
    await demoSignIn("zoe@test.io")
    await setDemoRole("user")
    await setDemoSubscriptionActive(false)
    expect(jar.get(DEMO_SESSION_COOKIE)).toBeTruthy()

    await resetDemoSession()

    expect(jar.has(DEMO_SESSION_COOKIE)).toBe(false)
    const user = await getDemoUser()
    const defaults = defaultDemoSession()
    expect(user?.email).toBe(defaults.email)
    expect(await getDemoDisplayName()).toBe(defaults.displayName)
    expect(await getDemoRole()).toBe(defaults.role)
    expect(await getDemoSubscriptionStatus()).toBe(defaults.subscriptionStatus)
  })
})
