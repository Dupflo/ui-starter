import type { ReactNode } from "react"
import { Logo } from "@/components/brand/logo"

/** Full-screen centred auth layout (pine canvas + white card), used by login + signup. */
export function AuthShell({
  children,
  footer,
}: {
  children: ReactNode
  footer: string
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-pine p-6 sm:p-10">
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
