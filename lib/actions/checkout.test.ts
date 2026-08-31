import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock server-only (implicit via "use server" module).
vi.mock("server-only", () => ({}))

// Set up a known price ID from env.
vi.stubEnv("STRIPE_PRICE_PRO", "price_test_pro_123")

// Mock Supabase server — mirrors settings.test.ts pattern.
const getUser = vi.fn()
vi.mock("@/lib/supabase/server", () => ({
  getUser: () => getUser(),
}))

// Mock Stripe client — getStripe().checkout.sessions.create.
const sessionsCreate = vi.fn()
const webhooksConstructEvent = vi.fn()
const stripeInstance = {
  checkout: { sessions: { create: sessionsCreate } },
  webhooks: { constructEvent: webhooksConstructEvent },
}
vi.mock("@/lib/stripe/client", () => ({
  getStripe: () => stripeInstance,
}))

// Mock observability.
vi.mock("@/lib/observability", () => ({
  reportError: vi.fn(),
}))

// Mock lib/stripe/config — PLANS with a known priceId.
vi.mock("@/lib/stripe/config", () => ({
  PLANS: [
    {
      id: "pro",
      priceId: "price_test_pro_123",
      nameKey: "planProName",
      priceLabelKey: "planProPrice",
    },
  ],
  getPlanByPriceId: (id: string) =>
    id === "price_test_pro_123"
      ? { id: "pro", priceId: "price_test_pro_123" }
      : undefined,
  getPlanById: (id: string) =>
    id === "pro" ? { id: "pro", priceId: "price_test_pro_123" } : undefined,
}))

// s11-demo-mode T4 — demo swap mocks.
const isDemoModeMock = vi.fn()
vi.mock("@/lib/demo/flag", () => ({ isDemoMode: () => isDemoModeMock() }))

const setDemoSubscriptionActiveMock = vi.fn()
vi.mock("@/lib/demo/state", () => ({
  setDemoSubscriptionActive: (active: boolean) =>
    setDemoSubscriptionActiveMock(active),
}))

import { createCheckoutSession } from "./checkout"

describe("createCheckoutSession — result-object, jamais de throw", () => {
  beforeEach(() => {
    getUser.mockReset()
    sessionsCreate.mockReset()
    isDemoModeMock.mockReset()
    isDemoModeMock.mockReturnValue(false)
  })

  it("retourne { ok:false, error:'unauthenticated' } sans session", async () => {
    getUser.mockResolvedValue(null)
    const result = await createCheckoutSession("price_test_pro_123")
    expect(result).toEqual({ ok: false, error: "unauthenticated" })
    expect(sessionsCreate).not.toHaveBeenCalled()
  })

  it("retourne { ok:false } si le priceId n'est pas dans PLANS", async () => {
    getUser.mockResolvedValue({ id: "user-1" })
    const result = await createCheckoutSession("price_unknown_xyz")
    expect(result).toMatchObject({ ok: false })
    expect(sessionsCreate).not.toHaveBeenCalled()
  })

  it("retourne { ok:true, url } avec un priceId valide et un user connecté", async () => {
    getUser.mockResolvedValue({ id: "user-1" })
    sessionsCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/pay/cs_test",
    })
    const result = await createCheckoutSession("price_test_pro_123")
    expect(result).toEqual({
      ok: true,
      url: "https://checkout.stripe.com/pay/cs_test",
    })
    expect(sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        line_items: [{ price: "price_test_pro_123", quantity: 1 }],
        metadata: { user_id: "user-1" },
        client_reference_id: "user-1",
      }),
    )
  })

  it("retourne { ok:false, error } si Stripe lance une exception (pas de throw)", async () => {
    getUser.mockResolvedValue({ id: "user-1" })
    sessionsCreate.mockRejectedValue(new Error("Stripe boom"))
    const result = await createCheckoutSession("price_test_pro_123")
    expect(result).toMatchObject({ ok: false })
    // Must not throw:
    await expect(
      createCheckoutSession("price_test_pro_123"),
    ).resolves.toBeDefined()
  })
})

// ─── s11-demo-mode T4 — demo swap, les deux branches ──────────────────────────

describe("createCheckoutSession — demo swap (T4)", () => {
  beforeEach(() => {
    getUser.mockReset()
    sessionsCreate.mockReset()
    isDemoModeMock.mockReset()
    setDemoSubscriptionActiveMock.mockReset()
  })

  it("simule la souscription (jamais Stripe) et retourne { ok:true, url } quand le flag est actif", async () => {
    isDemoModeMock.mockReturnValue(true)
    getUser.mockResolvedValue({ id: "demo-1" })
    const result = await createCheckoutSession("price_test_pro_123")
    expect(result).toEqual({ ok: true, url: "/dashboard" })
    expect(sessionsCreate).not.toHaveBeenCalled()
    expect(setDemoSubscriptionActiveMock).toHaveBeenCalledWith(true)
  })

  it("retombe sur le chemin réel (Stripe) quand le flag est absent", async () => {
    isDemoModeMock.mockReturnValue(false)
    getUser.mockResolvedValue({ id: "user-1" })
    sessionsCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/pay/cs_test",
    })
    const result = await createCheckoutSession("price_test_pro_123")
    expect(result).toEqual({
      ok: true,
      url: "https://checkout.stripe.com/pay/cs_test",
    })
    expect(setDemoSubscriptionActiveMock).not.toHaveBeenCalled()
  })
})
