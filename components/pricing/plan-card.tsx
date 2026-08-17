import { Card } from "@/components/ui/card"
import { Title } from "@/components/ui/title"
import { Text } from "@/components/ui/text"
import type { Plan } from "@/lib/stripe/config"
import { SubscribeButton } from "@/app/[locale]/pricing/subscribe-button"

type Props = {
  plan: Plan
  /** i18n: plan name resolved string */
  planName: string
  /** i18n: price label resolved string */
  planPrice: string
  /** i18n: features description resolved string (optional) */
  planFeatures?: string
  /** i18n: subscribe CTA label */
  subscribeLabel: string
  /** i18n: redirecting label (pending state) */
  pendingLabel: string
  /** i18n: message to show when user is not authenticated */
  loginMessage: string
}

/**
 * Shared plan card component used by both `/pricing` and `/` (landing).
 *
 * Server component — SubscribeButton is the "use client" island inside.
 * Keeps the exact same Card/Title/Text/SubscribeButton structure as the
 * inline card that was in pricing/page.tsx:53-76.
 */
export function PlanCard({
  plan,
  planName,
  planPrice,
  planFeatures,
  subscribeLabel,
  pendingLabel,
  loginMessage,
}: Props) {
  return (
    <Card pad="lg" className="w-full max-w-sm">
      <Title as="h2">{planName}</Title>
      <Text size="base" className="mt-2 font-semibold">
        {planPrice}
      </Text>
      {planFeatures && (
        <Text size="sm" leading className="mt-4 text-muted">
          {planFeatures}
        </Text>
      )}
      <div className="mt-6">
        <SubscribeButton
          priceId={plan.priceId}
          label={subscribeLabel}
          pendingLabel={pendingLabel}
          loginMessage={loginMessage}
          loginHref="/login"
        />
      </div>
    </Card>
  )
}
