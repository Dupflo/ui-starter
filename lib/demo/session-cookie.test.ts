import { describe, it, expect } from "vitest"
import {
  DEMO_SESSION_COOKIE,
  defaultDemoSession,
  parseDemoSession,
  serializeDemoSession,
} from "./session-cookie"

// Fix (s11-demo-mode review, critical) — the demo SESSION must cross the
// middleware boundary. Next compiles proxy.ts (middleware) and the server
// actions/RSC tree into SEPARATE module graphs, so the old module-scoped
// `let state` (T3) could never be observed by both sides. A cookie is the
// only channel both read. This file tests the CODEC in isolation — pure
// functions, no cookies() I/O, no framework mock needed — so both proxy.ts
// (via `request.cookies`) and lib/demo/state.ts (via `next/headers`
// `cookies()`) can share the exact same parsing/serialization logic.

describe("lib/demo/session-cookie.ts — pure codec", () => {
  it("exports a stable cookie name", () => {
    expect(DEMO_SESSION_COOKIE).toBe("demo_session")
  })

  it("defaultDemoSession() is signed in, admin, active subscription (whole app visible out of the box)", () => {
    const session = defaultDemoSession()
    expect(session.email).toBeTruthy()
    expect(session.role).toBe("admin")
    expect(session.subscriptionStatus).toBe("active")
    expect(session.displayName).toBeTruthy()
  })

  it("round-trips a signed-in session through serialize -> parse", () => {
    const session = {
      email: "visitor@example.com",
      role: "user" as const,
      subscriptionStatus: "canceled" as const,
      displayName: "Visitor",
    }
    const raw = serializeDemoSession(session)
    expect(parseDemoSession(raw)).toEqual(session)
  })

  it("round-trips a signed-out session (email: null) — role/subscription/displayName survive independently", () => {
    const session = {
      email: null,
      role: "admin" as const,
      subscriptionStatus: "active" as const,
      displayName: "Alex Démo",
    }
    const raw = serializeDemoSession(session)
    expect(parseDemoSession(raw)).toEqual(session)
  })

  it("a missing cookie (undefined) resolves to the default signed-in session, never a throw", () => {
    expect(parseDemoSession(undefined)).toEqual(defaultDemoSession())
  })

  it("a malformed cookie value (not JSON) fails closed to the default session, never a throw", () => {
    expect(() => parseDemoSession("not json at all {{{")).not.toThrow()
    expect(parseDemoSession("not json at all {{{")).toEqual(
      defaultDemoSession(),
    )
  })

  it("a structurally wrong cookie value (missing fields) fails closed to the default session", () => {
    expect(parseDemoSession(JSON.stringify({ email: "x@x.com" }))).toEqual(
      defaultDemoSession(),
    )
  })

  it("a cookie with an invalid role/status enum value fails closed to the default session", () => {
    const bad = JSON.stringify({
      email: "x@x.com",
      role: "superadmin",
      subscriptionStatus: "active",
      displayName: "X",
    })
    expect(parseDemoSession(bad)).toEqual(defaultDemoSession())
  })
})
