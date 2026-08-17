import type { ReactNode } from "react"
import { Logo } from "@/components/brand/logo"
import { LocaleMenu } from "@/components/ui/locale-menu"

/** Full-screen centred auth layout (pine canvas + white card), used by login + signup. */
export function AuthShell({
  children,
  footer,
}: {
  children: ReactNode
  footer: string
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-pine p-6 sm:p-10">
      {/* Locale switcher — top-right corner of the pine canvas */}
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <LocaleMenu />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl bg-input p-8 shadow-float">{children}</div>
        <p className="mt-5 text-center font-mono text-2xs uppercase tracking-caps text-on-pine">
          {footer}
        </p>
      </div>
    </div>
  )
}
