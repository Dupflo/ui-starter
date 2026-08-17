"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createCheckoutSession } from "@/lib/actions/checkout"

type Props = {
  priceId: string
  /** i18n: subscribe CTA label */
  label: string
  /** i18n: redirecting label (pending state) */
  pendingLabel: string
  /** i18n: message to show when user is not authenticated */
  loginMessage: string
  /** URL to redirect if unauthenticated */
  loginHref: string
}

/**
 * Client CTA that calls the checkout action and redirects to Stripe.
 *
 * On success: window.location.href = result.url (external Stripe redirect).
 * On unauthenticated: shows a message (i18n) to invite login.
 */
export function SubscribeButton({
  priceId,
  label,
  pendingLabel,
  loginMessage,
  loginHref,
}: Props) {
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleClick() {
    setPending(true)
    setMessage(null)
    const result = await createCheckoutSession(priceId)
    if (result.ok) {
      window.location.href = result.url
    } else if (result.error === "unauthenticated") {
      setMessage(loginMessage)
      setPending(false)
      // Redirect to login after brief moment so message is readable.
      window.location.href = loginHref
    } else {
      setMessage("Error")
      setPending(false)
    }
  }

  return (
    <div>
      <Button onClick={handleClick} disabled={pending}>
        {pending ? pendingLabel : label}
      </Button>
      {message && (
        <p className="mt-2 text-sm text-muted" role="status">
          {message}
        </p>
      )}
    </div>
  )
}
