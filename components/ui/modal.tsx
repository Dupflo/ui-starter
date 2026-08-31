"use client"

import { useEffect, useState, type ReactNode } from "react"
import { cn } from "@/lib/cn"

// Must outlast the longest exit animation (mobile sheet-down = 0.28s).
const EXIT_MS = 300

// Width applies from sm up; on mobile the dialog is a full-width bottom sheet.
export const sizes = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  "3xl": "sm:max-w-3xl",
} as const

/**
 * Dialog. Bottom sheet on mobile (slides up), centred card on ≥sm — with a
 * fading blurred backdrop. Owns chrome only (backdrop, card, title, close,
 * scroll); the body is yours. Closes on Escape and backdrop click.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  size?: keyof typeof sizes
}) {
  // Stay mounted through the close animation: when `open` flips false we keep
  // rendering (with the exit classes) for EXIT_MS, then unmount.
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      setClosing(false)
      return
    }
    if (!mounted) return
    setClosing(true)
    const id = setTimeout(() => {
      setMounted(false)
      setClosing(false)
    }, EXIT_MS)
    return () => clearTimeout(id)
  }, [open, mounted])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className={cn(
          "absolute inset-0 bg-pine/40 backdrop-blur-sm",
          closing ? "overlay-fade-out" : "overlay-fade",
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "light-scope relative z-10 flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-input shadow-float sm:max-h-[90dvh] sm:rounded-2xl",
          closing ? "overlay-panel-out" : "overlay-panel",
          sizes[size],
        )}
      >
        <header className="flex items-center justify-between px-6 pt-5">
          <h3 className="font-display text-lg font-semibold text-ink-strong">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="-mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-fill hover:text-pine"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </header>
        <div className="overflow-y-auto overscroll-contain px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
          {children}
        </div>
      </div>
    </div>
  )
}
