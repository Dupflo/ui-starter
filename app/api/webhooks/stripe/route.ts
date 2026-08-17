import { NextResponse, type NextRequest } from "next/server"
import type Stripe from "stripe"
import { getStripe } from "@/lib/stripe/client"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getPlanByPriceId } from "@/lib/stripe/config"
import { reportError } from "@/lib/observability"

/**
 * Webhook Stripe — vérification de signature + idempotence + upsert subscriptions.
 *
 * Idempotence (ADR 005):
 *   A) insert stripe_events (PK = event.id) en tête : violation 23505 → rejeu → 200 sans ré-appliquer.
 *   B) upsert subscriptions onConflict:"user_id" → convergent (rejeu = no-op sur l'état).
 *
 * Identité : toujours depuis session.metadata.user_id / client_reference_id (serveur) — jamais du client.
 * Écriture : via le client service-role uniquement (bypasse RLS — un user ne peut pas forger status='active').
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const sig = req.headers.get("stripe-signature")
  if (!secret || !sig) {
    return new NextResponse("webhook non configuré", { status: 400 })
  }

  const raw = await req.text()
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, secret)
  } catch {
    return new NextResponse("signature invalide", { status: 400 })
  }

  const serviceRole = createServiceRoleClient()

  // ─── ADR 005 (A) — Idempotence: insert event.id first ─────────────────────
  // If event.id already exists (23505), it's a replay → acknowledge 200 without re-processing.
  // Any other DB error → 500 so Stripe retries (we don't silently drop events).
  const { error: dedupeError } = await serviceRole
    .from("stripe_events")
    .insert({ id: event.id })

  if (dedupeError) {
    if (dedupeError.code === "23505") {
      // Unique violation: replay detected — return 200 immediately, do nothing.
      return NextResponse.json({ received: true })
    }
    // Genuine DB error: let Stripe retry by returning 500.
    void reportError(dedupeError, {
      route: "/api/webhooks/stripe",
      service: "stripe",
      extra: { eventId: event.id, eventType: event.type },
    })
    return new NextResponse("db error", { status: 500 })
  }

  // ─── Event handling ───────────────────────────────────────────────────────
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      // Identity comes from the Checkout metadata set by createCheckoutSession.
      const userId =
        (session.metadata?.user_id as string | undefined) ??
        session.client_reference_id ??
        null
      if (!userId) break

      const stripeCustomerId =
        typeof session.customer === "string" ? session.customer : null
      const stripeSubscriptionId =
        typeof session.subscription === "string" ? session.subscription : null

      // Map priceId → plan name if possible.
      const lineItems = (
        session as unknown as {
          line_items?: { data: Array<{ price?: { id: string } }> }
        }
      ).line_items
      const priceId = lineItems?.data?.[0]?.price?.id
      const plan = priceId ? (getPlanByPriceId(priceId)?.id ?? null) : null

      // ─── ADR 005 (B) — Convergent upsert on user_id ───────────────────
      const { error: upsertError } = await serviceRole
        .from("subscriptions")
        .upsert(
          {
            user_id: userId,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            status: "active",
            plan,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        )
      if (upsertError) {
        void reportError(upsertError, {
          route: "/api/webhooks/stripe",
          service: "stripe",
          extra: { eventId: event.id, eventType: event.type },
        })
        return new NextResponse("db error", { status: 500 })
      }
      break
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription
      const stripeCustomerId =
        typeof subscription.customer === "string" ? subscription.customer : null
      if (!stripeCustomerId) break

      // The Stripe Subscription object does NOT carry metadata.user_id (that's on the
      // Checkout Session). Locate the existing row by stripe_customer_id (set at
      // checkout.session.completed) and update in place — no INSERT attempted, no
      // null-PK violation possible.
      const { error: updateError } = await serviceRole
        .from("subscriptions")
        .update({
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_customer_id", stripeCustomerId)
      if (updateError) {
        void reportError(updateError, {
          route: "/api/webhooks/stripe",
          service: "stripe",
          extra: { eventId: event.id, eventType: event.type },
        })
        return new NextResponse("db error", { status: 500 })
      }
      break
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription
      const stripeCustomerId =
        typeof subscription.customer === "string" ? subscription.customer : null
      if (!stripeCustomerId) break

      // Same rationale as customer.subscription.updated: locate by stripe_customer_id,
      // flip status to "canceled". No INSERT, no null-PK risk.
      const { error: deleteError } = await serviceRole
        .from("subscriptions")
        .update({
          stripe_subscription_id: subscription.id,
          status: "canceled",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_customer_id", stripeCustomerId)
      if (deleteError) {
        void reportError(deleteError, {
          route: "/api/webhooks/stripe",
          service: "stripe",
          extra: { eventId: event.id, eventType: event.type },
        })
        return new NextResponse("db error", { status: 500 })
      }
      break
    }

    default:
      // Unknown event type — acknowledge 200, do nothing.
      break
  }

  return NextResponse.json({ received: true })
}
