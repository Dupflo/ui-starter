import type { ComponentPropsWithoutRef } from "react"
import { cn } from "@/lib/cn"

// One look per real heading tag — the tag IS the API (no invented level names).
// h1 = page hero · h2 = page title · h3 = section · h4 = card label.
export const looks = {
  h1: "font-display text-3xl font-semibold tracking-tight text-ink-strong",
  h2: "font-display text-2xl font-semibold tracking-tight text-ink-strong",
  h3: "font-display text-base font-semibold text-ink-strong",
  h4: "font-display text-sm font-semibold text-ink-strong",
} as const

export type Heading = keyof typeof looks

/** Heading. `as` picks the real tag (`h1`–`h4`) and its matching look. */
export function Title({
  as = "h2",
  className,
  children,
  ...rest
}: { as?: Heading } & Omit<ComponentPropsWithoutRef<"h1">, "color">) {
  const Tag = as
  return (
    <Tag className={cn(looks[as], className)} {...rest}>
      {children}
    </Tag>
  )
}
