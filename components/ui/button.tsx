import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/cn"

type Variant = "primary" | "pine" | "outline" | "ghost" | "subtle" | "danger"
type Size = "sm" | "md" | "lg" | "icon"

const base =
  "inline-flex items-center justify-center gap-2 font-ui font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/60 focus-visible:ring-offset-2 focus-visible:ring-offset-pine disabled:pointer-events-none disabled:opacity-50"

// One complete look per variant (flat enum, no combinatorial props).
// primary works on any surface; pine/subtle are for the light app chrome.
const variants: Record<Variant, string> = {
  // Lime = the single strong accent. Dark text on lime, never white.
  primary: "bg-lime text-pine hover:bg-lime/90",
  pine: "light-scope bg-pine font-semibold text-paper hover:bg-pine-900",
  outline:
    "border border-paper/25 text-paper hover:border-paper/50 hover:bg-paper/5",
  ghost: "text-paper/80 hover:text-paper",
  subtle:
    "border border-line bg-paper font-semibold text-muted hover:text-pine",
  danger: "bg-danger font-semibold text-paper hover:opacity-90",
}

// Rounded rectangles (not pills) — radius scales with size, matching the maquette.
const sizes: Record<Size, string> = {
  sm: "h-[38px] rounded-lg px-4 text-xs",
  md: "h-11 rounded-lg px-5 text-sm", // 44px tall → meets min hit-target
  lg: "h-12 rounded-xl px-7 text-base",
  icon: "h-[34px] w-[34px] rounded-lg", // square, icon-only
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  href?: string
}

export function Button({
  variant = "primary",
  size = "md",
  href,
  className,
  children,
  type,
  ...props
}: ButtonProps) {
  const cls = cn(base, variants[variant], sizes[size], className)
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    )
  }
  // Default to "button" so a Button inside a <form> never submits by accident.
  return (
    <button type={type ?? "button"} className={cls} {...props}>
      {children}
    </button>
  )
}
