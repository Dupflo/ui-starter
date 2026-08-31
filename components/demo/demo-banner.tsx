import { getTranslations } from "next-intl/server"
import { Badge } from "@/components/ui/badge"
import { isDemoMode } from "@/lib/demo/flag"
import {
  getDemoUser,
  getDemoRole,
  getDemoSubscriptionStatus,
} from "@/lib/demo/state"
import { DemoBannerControls } from "./demo-banner-controls"

/**
 * T6 (s11-demo-mode) — persistent "demo mode" banner. Mounted once in the
 * root locale layout so it appears on every screen (public, auth, app,
 * legal), unconditionally when demo mode is active (guardrail contract
 * point 5: an active demo must always be visibly a demo).
 *
 * This component and DemoBannerControls are the ONLY two places in the UI
 * layer allowed to know demo mode exists — every other screen/component is
 * unaware of it (the `if (demo)` lives in the data/action layer, s11 T4).
 */
export async function DemoBanner() {
  if (!isDemoMode()) return null

  const t = await getTranslations("demo")
  const user = await getDemoUser()
  const role = await getDemoRole()
  const subscriptionActive = (await getDemoSubscriptionStatus()) === "active"

  return (
    <div className="light-scope print-hide relative z-50 flex flex-wrap items-center gap-3 border-b border-line bg-warning-soft px-4 py-2">
      <Badge tone="warning" size="sm" dot>
        {t("badge")}
      </Badge>
      <p className="text-xs text-muted">{t("notice")}</p>
      <div className="ml-auto">
        <DemoBannerControls
          loggedIn={!!user}
          role={role}
          subscriptionActive={subscriptionActive}
          labels={{
            emailLabel: t("emailLabel"),
            connect: t("connect"),
            logout: t("logout"),
            roleLabel: t("roleLabel"),
            roleUser: t("roleUser"),
            roleAdmin: t("roleAdmin"),
            subscribe: t("subscribe"),
            unsubscribe: t("unsubscribe"),
            reset: t("reset"),
          }}
        />
      </div>
    </div>
  )
}
