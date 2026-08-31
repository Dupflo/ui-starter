import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest, NextResponse } from "next/server"

// ---------------------------------------------------------------------------
// Approach: drive the real proxy() export via mocks of its two external deps.
//
// proxy.ts:
//   (1) calls intlMiddleware(request) → we mock "next-intl/middleware" to return
//       a NextResponse.next() with a .cookies shim.
//   (2) calls createServerClient(...) → we mock "@supabase/ssr" to inject
//       controlled getUser() responses.
//
// NextResponse.redirect() uses request.nextUrl.clone() internally; .nextUrl is
// derived from the request URL and is absolute, so the redirect constraint
// is satisfied without any production-code change.
// ---------------------------------------------------------------------------

const getUser = vi.fn()

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: () => getUser() },
  }),
}))

// next-intl/middleware's default export is a factory: createMiddleware(routing)
// returns the actual handler. We mock the factory to return a handler that
// yields NextResponse.next() so the proxy can write cookies onto the response.
vi.mock("next-intl/middleware", () => ({
  default: () => (_req: NextRequest) => NextResponse.next(),
}))

// We also need to stub next-intl/routing because proxy.ts imports routing from
// @/i18n/routing which in turn calls defineRouting from next-intl/routing.
vi.mock("@/i18n/routing", () => ({
  routing: {
    locales: ["fr", "en"],
    defaultLocale: "fr",
    localePrefix: "as-needed",
  },
}))

// s11-demo-mode T5 — demo identity short-circuit mocks. isDemoMode() defaults
// to false so the pre-existing AC3/AC4 suite below exercises the exact same
// real path it always did.
const isDemoModeMock = vi.fn()
vi.mock("@/lib/demo/flag", () => ({ isDemoMode: () => isDemoModeMock() }))

// Fix (s11-demo-mode review, critical) — the demo section below no longer
// mocks `@/lib/demo/state` or `@/lib/demo/session-cookie`: mocking the
// state module is exactly what collapsed proxy.ts's and the server
// actions' module graphs into one and made the wiring bug invisible (see
// docs/reviews/s11-demo-mode.md). `next/headers` IS mocked, because
// `cookies()` throws outside a real Next request scope — that is a
// framework-glue mock, not a mock of anything this file proves, and it is
// only exercised by the crossing describe block below (proxy.ts itself
// never imports `next/headers`).
let jar: Map<string, string> = new Map()
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
  }),
}))

import proxy from "./proxy"
import {
  DEMO_SESSION_COOKIE,
  defaultDemoSession,
  serializeDemoSession,
} from "@/lib/demo/session-cookie"

// Helper: build a minimal NextRequest for a given absolute path, optionally
// carrying a real `demo_session` cookie value (URL-encoded, exactly like a
// browser would send it back).
function makeRequest(path: string, demoSessionCookieValue?: string) {
  const url = new URL(path, "http://localhost:3000")
  const init: { headers?: HeadersInit } = {}
  if (demoSessionCookieValue !== undefined) {
    init.headers = {
      cookie: `${DEMO_SESSION_COOKIE}=${encodeURIComponent(demoSessionCookieValue)}`,
    }
  }
  return new NextRequest(url, init)
}

// AC3 + AC4 proxy decision cases.
describe("proxy — protection-decision (AC3 + AC4)", () => {
  beforeEach(() => {
    getUser.mockReset()
    isDemoModeMock.mockReset()
    isDemoModeMock.mockReturnValue(false)
  })

  // AC3: unauth on a PROTECTED path → redirect to /login?redirect=<encoded path>
  it("unauth on PROTECTED /fr/dashboard → redirect to /fr/login?redirect=", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    const req = makeRequest("/fr/dashboard")
    const res = await proxy(req)
    expect(res.status).toBe(307)
    const location = res.headers.get("location") ?? ""
    expect(location).toContain("/fr/login")
    expect(location).toContain("redirect=")
    expect(location).toContain(encodeURIComponent("/fr/dashboard"))
  })

  // AC3: unauth on nested PROTECTED path → same redirect pattern
  it("unauth on /fr/settings/profile → redirect to /fr/login?redirect=", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    const req = makeRequest("/fr/settings/profile")
    const res = await proxy(req)
    expect(res.status).toBe(307)
    const location = res.headers.get("location") ?? ""
    expect(location).toContain("/fr/login")
    expect(location).toContain("redirect=")
  })

  // AC4: authed on /fr/login → redirect to /fr/dashboard
  it("authed on /fr/login → redirect to /fr/dashboard", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "u1", email: "a@b.com" } },
      error: null,
    })
    const req = makeRequest("/fr/login")
    const res = await proxy(req)
    expect(res.status).toBe(307)
    const location = res.headers.get("location") ?? ""
    expect(location).toContain("/fr/dashboard")
  })

  // AC4: authed on /fr/signup → redirect to /fr/dashboard
  it("authed on /fr/signup → redirect to /fr/dashboard", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "u1", email: "a@b.com" } },
      error: null,
    })
    const req = makeRequest("/fr/signup")
    const res = await proxy(req)
    expect(res.status).toBe(307)
    const location = res.headers.get("location") ?? ""
    expect(location).toContain("/fr/dashboard")
  })

  // AC4: authed on a public path → passes through (no redirect)
  it("authed on public path /fr → passes through (no redirect)", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "u1", email: "a@b.com" } },
      error: null,
    })
    const req = makeRequest("/fr")
    const res = await proxy(req)
    // Not a redirect — status is 200 (NextResponse.next())
    expect(res.status).not.toBe(307)
  })

  // AC3+AC4: unauth on a public path → passes through (no redirect)
  it("unauth on public path /fr → passes through (no redirect)", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    const req = makeRequest("/fr")
    const res = await proxy(req)
    expect(res.status).not.toBe(307)
  })
})

// ─── s11-demo-mode T5 — demo identity short-circuit ────────────────────────────
//
// proxy.ts is the sharpest edge: it runs on every request and the real path
// must NEVER have anything inserted between `createServerClient` and
// `getUser()` (AGENTS.md rule). The demo branch must return BEFORE that
// block, not inside it — proven here by asserting the real Supabase
// `getUser` mock is never called when demo mode is active.
//
// Fix (s11-demo-mode review, critical): these tests drive proxy.ts with a
// REAL `demo_session` cookie value, parsed by the REAL, unmocked
// `lib/demo/session-cookie.ts` codec — exactly what a browser presents back
// on the next request. Nothing about "is there a demo user" is mocked here.

describe("proxy — demo identity via the real session cookie (T5, fixed)", () => {
  beforeEach(() => {
    getUser.mockReset()
    isDemoModeMock.mockReset()
  })

  it("demo ON, no cookie yet (fresh visit): default signed-in fixture passes through WITHOUT ever calling the real Supabase client", async () => {
    isDemoModeMock.mockReturnValue(true)

    const res = await proxy(makeRequest("/fr/dashboard"))

    expect(getUser).not.toHaveBeenCalled()
    expect(res.status).not.toBe(307)
    expect(res.status).not.toBe(308)
  })

  it("demo ON, cookie carries a signed-out session: protected route redirects to /login WITHOUT calling the real Supabase client", async () => {
    isDemoModeMock.mockReturnValue(true)
    const signedOut = serializeDemoSession({
      ...defaultDemoSession(),
      email: null,
    })

    const res = await proxy(makeRequest("/fr/dashboard", signedOut))

    expect(getUser).not.toHaveBeenCalled()
    expect(res.status).toBe(307)
    const location = res.headers.get("location") ?? ""
    expect(location).toMatch(/\/fr\/login/)
    // The discriminator that matters: proxy.ts ALWAYS appends ?redirect= —
    // a page-level redirect() never does. This is what distinguishes "the
    // middleware made this decision" from "the page did".
    expect(location).toContain("redirect=")
  })

  it("demo ON, cookie carries a signed-in session: passes through WITHOUT calling the real Supabase client", async () => {
    isDemoModeMock.mockReturnValue(true)
    const signedIn = serializeDemoSession(defaultDemoSession())

    const res = await proxy(makeRequest("/fr/dashboard", signedIn))

    expect(getUser).not.toHaveBeenCalled()
    expect(res.status).not.toBe(307)
  })

  it("demo OFF: falls through to the real Supabase client, unchanged, even if a demo cookie is present", async () => {
    isDemoModeMock.mockReturnValue(false)
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    const signedIn = serializeDemoSession(defaultDemoSession())

    const res = await proxy(makeRequest("/fr/dashboard", signedIn))

    expect(getUser).toHaveBeenCalledOnce()
    expect(res.headers.get("location")).toMatch(/\/fr\/login/)
  })
})

// ─── the critical fix: a server action's sign-out is now visible to proxy ──
//
// This is the exact scenario the review reproduced by hand (A–E): sign out
// via the banner, then hit a protected route. It uses the REAL, unmocked
// `lib/demo/state.ts` (the module the server actions call) so the write
// side and the read side (proxy.ts) are both real code — only
// `next/headers`'s `cookies()` is a fake jar, standing in for "the browser
// carries this cookie on the next request".

describe("proxy — demo sign-out (real lib/demo/state.ts) now crosses into the middleware", () => {
  beforeEach(async () => {
    jar = new Map()
    lastSetOptions = undefined
    getUser.mockReset()
    isDemoModeMock.mockReturnValue(true)
  })

  it("writes the session cookie with path=/, sameSite=lax, httpOnly=true (real action-side module)", async () => {
    const { demoSignIn } = await import("@/lib/demo/state")
    await demoSignIn("zoe@test.io")
    expect(lastSetOptions).toEqual({
      path: "/",
      sameSite: "lax",
      httpOnly: true,
    })
  })

  it("A→E: fresh visit passes, sign-out via the real action-side module makes the middleware redirect, sign-in makes it pass again", async () => {
    const { demoSignIn, demoSignOut } = await import("@/lib/demo/state")

    function requestFromJar(path: string) {
      return makeRequest(path, jar.get(DEMO_SESSION_COOKIE))
    }

    // A) fresh /dashboard (no cookie written yet) → passes.
    let res = await proxy(requestFromJar("/fr/dashboard"))
    expect(res.status).not.toBe(307)

    // sign in as an arbitrary email through the REAL action-side module —
    // exactly what demoLoginAction() does.
    await demoSignIn("zoe@test.io")
    res = await proxy(requestFromJar("/fr/dashboard"))
    expect(res.status).not.toBe(307)

    // B/C) sign OUT through the REAL action-side module — exactly what
    // signOutAction() does.
    await demoSignOut()
    res = await proxy(requestFromJar("/fr/dashboard"))
    expect(res.status).toBe(307)
    const location = res.headers.get("location") ?? ""
    expect(location).toMatch(/\/fr\/login/)
    expect(location).toContain("redirect=")
    expect(getUser).not.toHaveBeenCalled()

    // D) sign back in — the middleware must see it on the very next request.
    await demoSignIn("visitor@example.com")
    res = await proxy(requestFromJar("/fr/dashboard"))
    expect(res.status).not.toBe(307)
  })
})
