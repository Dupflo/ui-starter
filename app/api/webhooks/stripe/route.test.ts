import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock server-only.
vi.mock("server-only", () => ({}))

// ─── Stripe client mock ───────────────────────────────────────────────────────
const constructEvent = vi.fn()
vi.mock("@/lib/stripe/client", () => ({
  getStripe: () => ({ webhooks: { constructEvent } }),
}))

// ─── Service-role mock ────────────────────────────────────────────────────────
// Two chains:
//   - stripe_events → insert
//   - subscriptions → upsert (checkout path) OR update().eq() (updated/deleted path)
const stripeEventsInsert = vi.fn()
const subscriptionsUpsert = vi.fn()
const subscriptionsUpdateEq = vi.fn()
const subscriptionsUpdate = vi.fn(() => ({ eq: subscriptionsUpdateEq }))

const fromServiceRole = vi.fn((table: string) => {
  if (table === "stripe_events") return { insert: stripeEventsInsert }
  if (table === "subscriptions")
    return { upsert: subscriptionsUpsert, update: subscriptionsUpdate }
  return {}
})

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({ from: fromServiceRole }),
}))

// Mock PLANS config.
vi.mock("@/lib/stripe/config", () => ({
  PLANS: [{ id: "pro", priceId: "price_test_pro_123" }],
  getPlanByPriceId: (id: string) =>
    id === "price_test_pro_123"
      ? { id: "pro", priceId: "price_test_pro_123" }
      : undefined,
  getPlanById: () => undefined,
}))

// Mock observability.
vi.mock("@/lib/observability", () => ({ reportError: vi.fn() }))

import { POST } from "./route"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body = "{}") {
  return new NextRequest("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: {
      "stripe-signature": "sig_test",
      "content-type": "application/json",
    },
    body,
  })
}

const checkoutCompletedEvent = {
  id: "evt_checkout_001",
  type: "checkout.session.completed",
  data: {
    object: {
      metadata: { user_id: "user-abc" },
      client_reference_id: "user-abc",
      customer: "cus_123",
      subscription: "sub_456",
      line_items: { data: [{ price: { id: "price_test_pro_123" } }] },
    },
  },
}

const subscriptionDeletedEvent = {
  id: "evt_sub_deleted_001",
  type: "customer.subscription.deleted",
  data: {
    object: {
      customer: "cus_123",
      id: "sub_456",
      status: "canceled",
    },
  },
}

const subscriptionUpdatedEvent = {
  id: "evt_sub_updated_001",
  type: "customer.subscription.updated",
  data: {
    object: {
      customer: "cus_123",
      id: "sub_456",
      status: "past_due",
    },
  },
}

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    constructEvent.mockReset()
    stripeEventsInsert.mockReset()
    subscriptionsUpsert.mockReset()
    subscriptionsUpdate.mockClear()
    subscriptionsUpdateEq.mockReset()
    fromServiceRole.mockClear()
  })

  // ─── Bad signature → 400 ───────────────────────────────────────────────
  it("renvoie 400 si la signature Stripe est invalide", async () => {
    constructEvent.mockImplementation(() => {
      throw new Error("Invalid signature")
    })

    const req = makeRequest()
    // Need env vars set
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  // ─── checkout.session.completed → upsert active ───────────────────────
  it("checkout.session.completed → insert stripe_events puis upsert subscriptions(active)", async () => {
    constructEvent.mockReturnValue(checkoutCompletedEvent)
    stripeEventsInsert.mockResolvedValue({ error: null })
    subscriptionsUpsert.mockResolvedValue({ error: null })

    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"
    const req = makeRequest()
    const res = await POST(req)

    expect(res.status).toBe(200)

    // stripe_events insert called with the event id.
    expect(fromServiceRole).toHaveBeenCalledWith("stripe_events")
    expect(stripeEventsInsert).toHaveBeenCalledWith({ id: "evt_checkout_001" })

    // subscriptions upsert called with status: "active" and user_id from metadata.
    expect(fromServiceRole).toHaveBeenCalledWith("subscriptions")
    expect(subscriptionsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-abc",
        status: "active",
        stripe_customer_id: "cus_123",
        stripe_subscription_id: "sub_456",
      }),
      expect.objectContaining({ onConflict: "user_id" }),
    )
  })

  // ─── checkout.session.completed → DB error → 500 ─────────────────────
  it("checkout.session.completed → DB error sur upsert → 500", async () => {
    constructEvent.mockReturnValue(checkoutCompletedEvent)
    stripeEventsInsert.mockResolvedValue({ error: null })
    subscriptionsUpsert.mockResolvedValue({
      error: { code: "23000", message: "db error" },
    })

    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"
    const req = makeRequest()
    const res = await POST(req)

    expect(res.status).toBe(500)
  })

  // ─── IDEMPOTENCE: replay same event.id → upsert NOT called ───────────
  it("REJEU — même event.id (23505) → upsert subscriptions NON appelé, 200", async () => {
    constructEvent.mockReturnValue(checkoutCompletedEvent)

    // First call: insert succeeds.
    stripeEventsInsert.mockResolvedValueOnce({ error: null })
    subscriptionsUpsert.mockResolvedValue({ error: null })

    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"
    const res1 = await POST(makeRequest())
    expect(res1.status).toBe(200)
    expect(subscriptionsUpsert).toHaveBeenCalledTimes(1)

    // Reset mocks for second call.
    subscriptionsUpsert.mockClear()
    fromServiceRole.mockClear()

    // Second call: insert returns unique violation (23505) → replay.
    stripeEventsInsert.mockResolvedValueOnce({
      error: { code: "23505", message: "duplicate key value" },
    })

    const res2 = await POST(makeRequest())
    expect(res2.status).toBe(200)

    // upsert must NOT have been called on the second (replay) call.
    expect(subscriptionsUpsert).not.toHaveBeenCalled()
  })

  // ─── customer.subscription.deleted → update(canceled) by stripe_customer_id ──
  it("customer.subscription.deleted → update subscriptions(canceled) ciblant stripe_customer_id, user_id absent du payload ne bloque pas", async () => {
    constructEvent.mockReturnValue(subscriptionDeletedEvent)
    stripeEventsInsert.mockResolvedValue({ error: null })
    // update().eq() resolves OK
    subscriptionsUpdateEq.mockResolvedValue({ error: null })

    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"
    const req = makeRequest()
    const res = await POST(req)

    expect(res.status).toBe(200)

    // Must use update (not upsert) so no null-PK insertion is attempted.
    expect(subscriptionsUpsert).not.toHaveBeenCalled()
    expect(subscriptionsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "canceled",
        stripe_subscription_id: "sub_456",
      }),
    )
    // Must target the correct row by stripe_customer_id.
    expect(subscriptionsUpdateEq).toHaveBeenCalledWith(
      "stripe_customer_id",
      "cus_123",
    )
  })

  // ─── customer.subscription.deleted → DB error → 500 ─────────────────
  it("customer.subscription.deleted → DB error → 500 (Stripe retries)", async () => {
    constructEvent.mockReturnValue(subscriptionDeletedEvent)
    stripeEventsInsert.mockResolvedValue({ error: null })
    subscriptionsUpdateEq.mockResolvedValue({
      error: { code: "23000", message: "db error" },
    })

    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"
    const res = await POST(makeRequest())

    expect(res.status).toBe(500)
  })

  // ─── customer.subscription.updated → update by stripe_customer_id ────
  it("customer.subscription.updated → update subscriptions(raw status) ciblant stripe_customer_id", async () => {
    constructEvent.mockReturnValue(subscriptionUpdatedEvent)
    stripeEventsInsert.mockResolvedValue({ error: null })
    subscriptionsUpdateEq.mockResolvedValue({ error: null })

    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"
    const res = await POST(makeRequest())

    expect(res.status).toBe(200)
    expect(subscriptionsUpsert).not.toHaveBeenCalled()
    expect(subscriptionsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "past_due",
        stripe_subscription_id: "sub_456",
      }),
    )
    expect(subscriptionsUpdateEq).toHaveBeenCalledWith(
      "stripe_customer_id",
      "cus_123",
    )
  })
})
