import { cn } from "@/lib/cn"

type CardVariant = "surface" | "pine"
type CardPad = "sm" | "md" | "lg"

// Surface = bordered light card (default). Pine = solid dark card.
const variants: Record<CardVariant, string> = {
  surface: "border border-line bg-paper",
  pine: "light-scope bg-pine text-paper",
}

const pads: Record<CardPad, string> = {
  sm: "p-5",
  md: "p-6",
  lg: "p-8",
}

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant
  pad?: CardPad
  /** Semantic element to render (keeps <section>/<aside> meaning). */
  as?: "div" | "section" | "aside" | "article"
}

/** Reusable rounded block — radius + border + background come from here, not ad-hoc classes. */
export function Card({
  variant = "surface",
  pad = "md",
  as: Tag = "div",
  className,
  ...props
}: CardProps) {
  return (
    <Tag
      className={cn("rounded-2xl", variants[variant], pads[pad], className)}
      {...props}
    />
  )
}

/** Dashboard metric block: label + big value + optional trend. */
export function StatCard({
  label,
  value,
  trend,
}: {
  label: string
  value: string
  trend?: string
}) {
  return (
    <Card pad="sm">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-ink-strong">
        {value}
        {trend && (
          <span className="ml-1.5 align-middle text-sm font-medium text-success">
            {trend}
          </span>
        )}
      </p>
    </Card>
  )
}
