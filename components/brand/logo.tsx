import { cn } from "@/lib/cn"

/**
 * App logo. Two registers via `variant`:
 *  - dark  (default): on pine surfaces — A + spark lime, tick paper-white
 *  - light: on light surfaces — A + spark pine, tick lime
 * `withWordmark` toggles the "UI Starter" lockup; otherwise just the mark.
 */
export function Logo({
  variant = "dark",
  withWordmark = true,
  className,
}: {
  variant?: "dark" | "light"
  withWordmark?: boolean
  className?: string
}) {
  const body = variant === "dark" ? "fill-lime" : "fill-pine"
  const tick = variant === "dark" ? "fill-paper" : "fill-lime"
  const wordmark = variant === "dark" ? "text-paper" : "text-pine"
  const wordmarkAccent = variant === "dark" ? "text-lime" : "text-lime"

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 162.3 150"
        className="h-7 w-auto"
        role="img"
        aria-label="UI Starter"
      >
        <path
          className={body}
          d="M49.9,100.4c0.3,0.1,0.3,0.3,0.2,0.4c-0.8,0.5-1,1.5-1.5,2.6L27,150l-27,0l15.4-32L69.6,0l21,0L122,68.6 l-21.5,10.6L79.9,34.4L49.9,100.4z"
        />
        <path
          className={body}
          d="M129.4,85.8c0.6,0.6,0.8,1,1.2,1.8l29.2,62.4l-26.9,0L110,100.8L129.4,85.8z"
        />
        <path
          className={tick}
          d="M129.4,85.8l-19.4,15l-42.3,31.6l-17.7-31.6c0.1-0.1,0-0.3-0.2-0.4l17.5,8.5l24.6-12.8l70.5-36.3 L129.4,85.8z"
        />
      </svg>
      {withWordmark && (
        <span
          className={cn(
            "font-display text-xl font-semibold tracking-tight",
            wordmark,
          )}
        >
          UI <span className={wordmarkAccent}>Starter</span>
        </span>
      )}
    </span>
  )
}
