import { cn } from "@/lib/cn"

export type AvatarSize = "sm" | "md" | "lg"

export const sizes: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-2xs",
  md: "h-10 w-10 text-xs",
  lg: "h-14 w-14 text-sm",
}

type AvatarProps = {
  /** Image URL. Falls back to initials derived from `name` when absent —
   *  an avatar is never "nothing" just because a photo hasn't loaded. */
  src?: string
  /** The person's name — the source of the initials fallback AND, unless
   *  `decorative`, the avatar's accessible name. Always required: an
   *  avatar with no name to fall back on is exactly the class of failure
   *  this repo does not reproduce (an accessible name that only exists
   *  when some OTHER optional prop happens to be set — see
   *  docs/design-system.md's DataTable section on `caption`, and s14's
   *  combobox before its fix). */
  name: string
  size?: AvatarSize
  /** True when a visible name already sits next to this avatar (e.g. a
   *  table row that also shows the name as text) — the avatar is pulled
   *  out of the accessibility tree, since a screen reader would otherwise
   *  announce the same name twice for one row. False (default): the
   *  avatar itself carries the accessible name — for when no visible name
   *  sits next to it. */
  decorative?: boolean
  className?: string
}

/** First letter of each of the first two words, uppercased. */
function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

/**
 * Person avatar — image when `src` is given, initials otherwise. Strict
 * scope (s18-ui-kit-polish, human decision): nothing else — no presence
 * badge, no stacked group.
 *
 * Plain `<img>`, not `next/image`: next/image's value (responsive
 * srcset/resizing, remote-pattern allowlisting, lazy loading) targets
 * larger, network-fetched images — none of it helps a ~32-56px avatar,
 * whose `src` here is a local, already-tiny inline SVG data-URI (see
 * components/gallery/avatar-fixtures.ts) and, in a real product, would
 * usually already be a signed URL from object storage needing no further
 * optimisation. And `<img alt="">` is what makes a `decorative` avatar
 * produce no AX node at all — a background-image `<span>` (the technique
 * components/app/app-sidebar.tsx uses for its account photo) cannot express
 * that: it stays a `role="img"` node regardless of `aria-label`, so the
 * decorative case would need a second markup shape. One real `<img>`
 * covers both.
 */
export function Avatar({
  src,
  name,
  size = "md",
  decorative = false,
  className,
}: AvatarProps) {
  const shared = cn(
    "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-fill font-semibold text-ink",
    sizes[size],
    className,
  )

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- deliberate: see the doc comment above (real <img> for native alt/decorative semantics, not next/image's optimisation)
      <img
        src={src}
        alt={decorative ? "" : name}
        className={cn(shared, "object-cover")}
      />
    )
  }

  return (
    <span
      className={shared}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative ? "true" : undefined}
    >
      {initials(name)}
    </span>
  )
}
