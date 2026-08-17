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

import proxy from "./proxy"

// Helper: build a minimal NextRequest for a given absolute path.
function makeRequest(path: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"))
}

// AC3 + AC4 proxy decision cases.
describe("proxy — protection-decision (AC3 + AC4)", () => {
  beforeEach(() => {
    getUser.mockReset()
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
