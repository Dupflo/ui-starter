"use client"

import { type ReactNode } from "react"
import { MobileSidebar } from "@/components/app/mobile-sidebar"
import { DarkModeToggle } from "@/components/app/dark-mode-toggle"

/**
 * Shared app top-bar (62px): page title (left) + dark toggle (right).
 * Used by every app screen for consistent chrome. (Settings lives in the sidebar.)
 *
 * `actions` (optional): page-specific controls shown on the right at lg+.
 */
export function AppHeader({
  title,
  actions,
  titleExtra,
}: {
  title: string
  actions?: ReactNode
  /** Contrôle optionnel affiché juste après le titre. */
  titleExtra?: ReactNode
}) {
  return (
    <div className="sticky top-0 z-10 flex h-[62px] shrink-0 items-center justify-between gap-4 border-b border-line bg-sand px-6 md:px-7">
      <div className="flex min-w-0 items-center gap-2.5">
        <MobileSidebar />
        <h2 className="truncate font-display text-base font-semibold tracking-tight text-ink-strong">
          {title}
        </h2>
        {titleExtra}
      </div>
      <div className="flex items-center gap-3.5">
        {actions ? (
          <div className="hidden items-center gap-2.5 lg:flex">{actions}</div>
        ) : null}
        <DarkModeToggle />
      </div>
    </div>
  )
}
