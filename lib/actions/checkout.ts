"use server"

import { getUser } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe/client"
import { getPlanByPriceId } from "@/lib/stripe/config"
import { reportError } from "@/lib/observability"
import { isDemoMode } from "@/lib/demo/flag"
import { setDemoSubscriptionActive } from "@/lib/demo/state"

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string }

/**
 * Crée une session Stripe Checkout hébergée pour l'utilisateur connecté.
 *
 * - Identité dérivée de `getUser()` — jamais un userId en argument (AGENTS.md law).
 * - Valide que `priceId` appartient à `PLANS` — refuse tout priceId arbitraire du client.
 * - Retourne un result-object : pas de throw (convention lib/actions/settings.ts).
 */
export async function createCheckoutSession(
  priceId: string,
): Promise<CheckoutResult> {
  const user = await getUser()
  if (!user) return { ok: false, error: "unauthenticated" }

  // Validate priceId against known plans (reject arbitrary client-supplied values).
  const plan = getPlanByPriceId(priceId)
  if (!plan) return { ok: false, error: "invalid_price" }

  // s11-demo-mode (T4) : simule la souscription (jamais Stripe) — AC
  // "souscription simulée qui débloque le contenu gated".
  if (isDemoMode()) {
    await setDemoSubscriptionActive(true)
    return { ok: true, url: "/dashboard" }
  }

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ""
    const successUrl = siteUrl ? `${siteUrl}/dashboard` : "/dashboard"
    const cancelUrl = siteUrl ? `${siteUrl}/pricing` : "/pricing"

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: user.id,
      metadata: { user_id: user.id },
    })

    if (!session.url) return { ok: false, error: "no_url" }
    return { ok: true, url: session.url }
  } catch (err) {
    void reportError(err, {
      route: "checkout",
      service: "stripe",
      userId: user.id,
    })
    return { ok: false, error: "failed" }
  }
}
