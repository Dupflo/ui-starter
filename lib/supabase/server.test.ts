import { describe, it, expect, vi, beforeEach } from "vitest"

// T4 (s11-demo-mode) — getUser() is the single identity source (4 pages + 2
// data modules + 2 actions call it). Demo swap must short-circuit BEFORE any
// Supabase call, and must not touch the real path when demo mode is off.

const supabaseGetUser = vi.fn()
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser: supabaseGetUser } }),
}))
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [],
    get: () => undefined,
    set: () => {},
  }),
}))

const isDemoModeMock = vi.fn()
vi.mock("@/lib/demo/flag", () => ({ isDemoMode: () => isDemoModeMock() }))

const getDemoUserMock = vi.fn()
vi.mock("@/lib/demo/state", () => ({ getDemoUser: () => getDemoUserMock() }))

import { getUser } from "./server"

describe("getUser — demo swap (T4)", () => {
  beforeEach(() => {
    supabaseGetUser.mockReset()
    isDemoModeMock.mockReset()
    getDemoUserMock.mockReset()
  })

  it("returns the demo user, and never calls the real Supabase client, when demo mode is active", async () => {
    isDemoModeMock.mockReturnValue(true)
    getDemoUserMock.mockReturnValue({
      id: "demo-1",
      email: "demo@example.com",
    })

    const user = await getUser()

    expect(user).toEqual({ id: "demo-1", email: "demo@example.com" })
    expect(supabaseGetUser).not.toHaveBeenCalled()
  })

  it("falls through to the real Supabase client, unchanged, when demo mode is off", async () => {
    isDemoModeMock.mockReturnValue(false)
    supabaseGetUser.mockResolvedValue({
      data: { user: { id: "real-1" } },
      error: null,
    })

    const user = await getUser()

    expect(user).toEqual({ id: "real-1" })
    expect(getDemoUserMock).not.toHaveBeenCalled()
  })

  it("returns null on the real path when there is no session (unchanged behaviour)", async () => {
    isDemoModeMock.mockReturnValue(false)
    supabaseGetUser.mockResolvedValue({ data: { user: null }, error: null })

    expect(await getUser()).toBeNull()
  })
})
