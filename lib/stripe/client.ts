import "server-only"
import Stripe from "stripe"

export const STRIPE_KEY_MISSING = "STRIPE_KEY_MISSING"

/** Client Stripe serveur. Utilise STRIPE_SECRET_KEY (test ou live selon la clé). */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error(STRIPE_KEY_MISSING)
  return new Stripe(key)
}
