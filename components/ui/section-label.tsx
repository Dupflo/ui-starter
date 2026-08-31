import { cn } from "@/lib/cn"

export type Tone = "muted" | "lime" | "pine"

export const tones: Record<Tone, string> = {
  muted: "text-muted",
  lime: "text-lime",
  pine: "text-pine/60",
}

/** The numbered/kicker label — Geist Mono, uppercase, tracked. Echoes the CV's "01 /" signature. */
export function SectionLabel({
  index,
  tone = "muted",
  className,
  children,
}: {
  index?: string
  tone?: Tone
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono text-xs uppercase tracking-caps",
        tones[tone],
        className,
      )}
    >
      {index && <span aria-hidden="true">{index}</span>}
      {index && (
        <span aria-hidden="true" className="h-px w-6 bg-current opacity-40" />
      )}
      {children}
    </span>
  )
}
