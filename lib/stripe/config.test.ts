import { describe, it, expect, vi } from "vitest"

// Mock server-only so it doesn't throw in the test environment.
vi.mock("server-only", () => ({}))

// Set a test env var before importing the module.
vi.stubEnv("STRIPE_PRICE_PRO", "price_test_pro_123")

import { PLANS, getPlanByPriceId, getPlanById } from "./config"

describe("PLANS — source unique des plans Stripe", () => {
  it("contient 1 ou 2 plans", () => {
    expect(PLANS.length).toBeGreaterThanOrEqual(1)
    expect(PLANS.length).toBeLessThanOrEqual(2)
  })

  it("chaque plan a un id non vide", () => {
    for (const plan of PLANS) {
      expect(plan.id).toBeTruthy()
    }
  })

  it("chaque plan a des clés i18n non vides", () => {
    for (const plan of PLANS) {
      expect(plan.nameKey).toBeTruthy()
      expect(plan.priceLabelKey).toBeTruthy()
    }
  })
})

describe("getPlanByPriceId", () => {
  it("retourne le plan si le priceId est connu", () => {
    const plan = PLANS[0]
    const found = getPlanByPriceId(plan.priceId)
    expect(found).toBeDefined()
    expect(found?.id).toBe(plan.id)
  })

  it("retourne undefined pour un priceId inconnu", () => {
    expect(getPlanByPriceId("price_unknown_xyz")).toBeUndefined()
  })
})

describe("getPlanById", () => {
  it("retourne le plan si l'id est connu", () => {
    const plan = PLANS[0]
    const found = getPlanById(plan.id)
    expect(found).toBeDefined()
    expect(found?.priceId).toBe(plan.priceId)
  })

  it("retourne undefined pour un id inconnu", () => {
    expect(getPlanById("nonexistent")).toBeUndefined()
  })
})
