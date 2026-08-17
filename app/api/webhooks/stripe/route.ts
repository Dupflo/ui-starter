import { NextResponse, type NextRequest } from "next/server"
import type Stripe from "stripe"
import { getStripe } from "@/lib/stripe/client"

/**
 * Webhook Stripe — STUB baseline.
 *
 * Vérifie la signature Stripe sur le corps brut (`constructEvent`) et acquitte
 * l'événement. La logique métier (abonnements) est branchée dans une story
 * ultérieure (s06) ; on garde la route et la vérification de signature pour
 * préserver le contrat. Public : la signature Stripe fait foi.
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

  // Aucune logique métier dans le baseline : on acquitte l'événement.
  void event

  return NextResponse.json({ received: true })
}
