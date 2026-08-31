import type { ElementType, ReactNode } from "react"
import { cn } from "@/lib/cn"

export const sizes = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
} as const

export const tones = {
  muted: "text-muted",
  ink: "text-ink",
  strong: "text-ink-strong",
} as const

/**
 * Body copy. `size` + `tone` are orthogonal text props (not a combinatorial
 * explosion); `leading` opts into relaxed line-height for paragraphs.
 */
export function Text({
  as = "p",
  size = "sm",
  tone = "muted",
  leading = false,
  className,
  children,
}: {
  as?: ElementType
  size?: keyof typeof sizes
  tone?: keyof typeof tones
  leading?: boolean
  className?: string
  children: ReactNode
}) {
  const Tag = as
  return (
    <Tag
      className={cn(
        sizes[size],
        tones[tone],
        leading && "leading-relaxed",
        className,
      )}
    >
      {children}
    </Tag>
  )
}
