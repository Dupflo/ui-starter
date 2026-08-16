import type { ReactNode } from "react"
import { cn } from "@/lib/cn"

// One colour per tone (soft bg + readable text). Dot inherits the text colour.
const tones = {
  neutral: "bg-fill-mute text-muted",
  warning: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
  danger: "bg-danger/10 text-danger",
  info: "bg-cat-sector-soft text-cat-sector",
  pine: "bg-pine text-lime",
  link: "bg-success-soft text-link",
} as const

const sizes = {
  sm: "px-2.5 py-0.5 text-2xs",
  md: "px-3 py-1.5 text-xs",
} as const

/** Pill badge — status / labels. `dot` prepends a coloured dot. */
export function Badge({
  tone = "neutral",
  size = "md",
  dot = false,
  className,
  children,
}: {
  tone?: keyof typeof tones
  size?: keyof typeof sizes
  dot?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold",
        tones[tone],
        sizes[size],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  )
}
