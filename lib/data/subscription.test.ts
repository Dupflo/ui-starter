import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock server-only so it doesn't throw in the test environment.
vi.mock("server-only", () => ({}))

// Mock Supabase client — mirrors settings.test.ts pattern.
const maybeSingle = vi.fn()
const eq = vi.fn(() => ({ maybeSingle }))
const select = vi.fn(() => ({ eq }))
const from = vi.fn(() => ({ select }))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from }),
}))

// s11-demo-mode T4 — demo swap mocks.
const isDemoModeMock = vi.fn()
vi.mock("@/lib/demo/flag", () => ({ isDemoMode: () => isDemoModeMock() }))

const getDemoSubscriptionStatusMock = vi.fn()
vi.mock("@/lib/demo/state", () => ({
  getDemoSubscriptionStatus: () => getDemoSubscriptionStatusMock(),
}))

import { getSubscription, isActiveSubscriber } from "./subscription"

describe("isActiveSubscriber — prédicat pur", () => {
  it("retourne true pour status 'active'", () => {
    expect(isActiveSubscriber("active")).toBe(true)
  })

  it("retourne false pour status 'canceled'", () => {
    expect(isActiveSubscriber("canceled")).toBe(false)
  })

  it("retourne false pour status 'trialing'", () => {
    expect(isActiveSubscriber("trialing")).toBe(false)
  })

  it("retourne false pour status 'past_due'", () => {
    expect(isActiveSubscriber("past_due")).toBe(false)
  })

  it("retourne false pour null", () => {
    expect(isActiveSubscriber(null)).toBe(false)
  })

  it("retourne false pour undefined", () => {
    expect(isActiveSubscriber(undefined)).toBe(false)
  })
})

describe("getSubscription", () => {
  beforeEach(() => {
    from.mockClear()
    select.mockClear()
    eq.mockClear()
    maybeSingle.mockClear()
    isDemoModeMock.mockReset()
    isDemoModeMock.mockReturnValue(false)
  })

  it("retourne { status, plan } si la ligne existe", async () => {
    maybeSingle.mockResolvedValue({
      data: { status: "active", plan: "pro" },
      error: null,
    })
    const result = await getSubscription("user-1")
    expect(result).toEqual({ status: "active", plan: "pro" })
    expect(from).toHaveBeenCalledWith("subscriptions")
    expect(select).toHaveBeenCalledWith("status, plan")
    expect(eq).toHaveBeenCalledWith("user_id", "user-1")
  })

  it("retourne null si aucune ligne (data: null)", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null })
    const result = await getSubscription("user-2")
    expect(result).toBeNull()
  })
})

// ─── s11-demo-mode T4 — demo swap, les deux branches ──────────────────────────

describe("getSubscription — demo swap (T4)", () => {
  beforeEach(() => {
    from.mockClear()
    isDemoModeMock.mockReset()
    getDemoSubscriptionStatusMock.mockReset()
  })

  it("retourne le statut démo sans toucher Supabase quand le flag est actif", async () => {
    isDemoModeMock.mockReturnValue(true)
    getDemoSubscriptionStatusMock.mockReturnValue("active")
    const result = await getSubscription("ignored")
    expect(result).toEqual({ status: "active", plan: "pro" })
    expect(from).not.toHaveBeenCalled()
  })

  it("retombe sur le chemin réel quand le flag est absent", async () => {
    isDemoModeMock.mockReturnValue(false)
    maybeSingle.mockResolvedValue({
      data: { status: "canceled", plan: "pro" },
    })
    const result = await getSubscription("u1")
    expect(result).toEqual({ status: "canceled", plan: "pro" })
    expect(getDemoSubscriptionStatusMock).not.toHaveBeenCalled()
  })
})
