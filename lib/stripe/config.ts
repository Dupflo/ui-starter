import "server-only"

/**
 * Single source of truth for Stripe subscription plans.
 *
 * Price IDs are read from environment variables (never hard-coded).
 * Label keys reference the `pricing` i18n namespace.
 * Shared by: pricing page, checkout action, and s07 landing.
 *
 * Graveyard: no complex multi-plan logic (see docs/stories.md).
 */

export type Plan = {
  /** Internal identifier (stable, used in URLs and logic). */
  id: string
  /** Stripe price ID, read from env. */
  priceId: string
  /** i18n key for the plan name (namespace: pricing). */
  nameKey: string
  /** i18n key for the price label (e.g. "€9 / month"). */
  priceLabelKey: string
  /** i18n key for the features list description (optional). */
  featuresKey?: string
}

export const PLANS: Plan[] = [
  {
    id: "pro",
    priceId: process.env.STRIPE_PRICE_PRO ?? "",
    nameKey: "planProName",
    priceLabelKey: "planProPrice",
    featuresKey: "planProFeatures",
  },
]

/**
 * Look up a plan by its Stripe price ID.
 * Returns undefined if not found (unknown / arbitrary price IDs are rejected).
 */
export function getPlanByPriceId(priceId: string): Plan | undefined {
  return PLANS.find((p) => p.priceId === priceId)
}

/**
 * Look up a plan by its internal id.
 */
export function getPlanById(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id)
}
