"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { TextField } from "@/components/ui/text-field"
import { useLogout } from "@/lib/hooks/use-logout"
import {
  demoLoginAction,
  demoSetRoleAction,
  demoSetSubscriptionAction,
  demoResetAction,
} from "@/lib/actions/demo-controls"
import type { DemoRole } from "@/lib/demo/session-cookie"

export type DemoBannerLabels = {
  emailLabel: string
  connect: string
  logout: string
  roleLabel: string
  roleUser: string
  roleAdmin: string
  subscribe: string
  unsubscribe: string
  reset: string
}

/**
 * T6 (s11-demo-mode) — the interactive half of the demo banner. Server state
 * only changes via the demo-only actions (lib/actions/demo-controls.ts); a
 * full reload picks up the new server-rendered state (module-scoped state
 * lives on the server, not in the client bundle).
 */
export function DemoBannerControls({
  loggedIn,
  role,
  subscriptionActive,
  labels,
}: {
  loggedIn: boolean
  role: DemoRole
  subscriptionActive: boolean
  labels: DemoBannerLabels
}) {
  const [loginEmail, setLoginEmail] = useState("")
  const [pending, startTransition] = useTransition()
  const { logout, signingOut } = useLogout()

  // Available regardless of login state: a role/subscription flip made while
  // signed out still "sticks" for the next sign-in (lib/demo/session-cookie.ts),
  // so the reset control must be reachable from both branches below.
  const resetButton = (
    <Button
      type="button"
      variant="subtle"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await demoResetAction()
          window.location.reload()
        })
      }
    >
      {labels.reset}
    </Button>
  )

  if (!loggedIn) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            startTransition(async () => {
              await demoLoginAction(loginEmail)
              window.location.assign("/dashboard")
            })
          }}
          className="flex flex-wrap items-end gap-2"
        >
          <TextField
            label={labels.emailLabel}
            registration={{
              name: "demoEmail",
              onChange: async (e: { target: { value: string } }) => {
                setLoginEmail(e.target.value)
              },
              onBlur: async () => {},
              ref: () => {},
            }}
          />
          <Button type="submit" variant="subtle" size="sm" disabled={pending}>
            {labels.connect}
          </Button>
        </form>
        {resetButton}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        aria-label={labels.roleLabel}
        value={role}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as DemoRole
          startTransition(async () => {
            await demoSetRoleAction(next)
            window.location.reload()
          })
        }}
        options={[
          { value: "user", label: labels.roleUser },
          { value: "admin", label: labels.roleAdmin },
        ]}
      />
      <Button
        type="button"
        variant="subtle"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await demoSetSubscriptionAction(!subscriptionActive)
            window.location.reload()
          })
        }
      >
        {subscriptionActive ? labels.unsubscribe : labels.subscribe}
      </Button>
      <Button
        type="button"
        variant="subtle"
        size="sm"
        disabled={signingOut}
        onClick={logout}
      >
        {labels.logout}
      </Button>
      {resetButton}
    </div>
  )
}
