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
