import type { ReactNode } from "react"
import { COMPONENTS } from "@/components/gallery/components-map"
import { CodeDisclosure } from "@/components/gallery/code-disclosure"
import { cn } from "@/lib/cn"
import {
  codeOf,
  renderSnippet,
  type Snippet,
} from "@/components/gallery/snippet"

export type ExampleLabels = {
  copy: string
  copied: string
  codeShow: string
  codeHide: string
}

/**
 * One primitive/block example: the live render on top, its collapsible code
 * underneath. Every registered component reaches this — server component,
 * the only client bit inside is `CodeDisclosure` (s13-gallery-ergonomics:
 * collapsed by default, per-item state, still delegates to `CopyButton`).
 * There is no bypass: fifteen primitives, fifteen code blocks (review fix,
 * s12-ui-gallery — `Modal`, `Lightbox`, `LocaleMenu`, `LocaleSwitcher` used
 * to render outside `Example` entirely and had none).
 *
 * By default the live render comes from `renderSnippet(snippet)` — the same
 * `Snippet` `codeOf` reads, so the two cannot diverge (see snippet.ts).
 * `render` is an explicit, narrow escape hatch for the few cases where that
 * default cannot be used: React refuses `ref`-bearing props (e.g.
 * `TextField`'s react-hook-form `registration`) inside a Server Component
 * render pass, and `Modal`/`Lightbox` need local open/close state and a
 * trigger, which a static snippet render cannot provide. Each such usage is
 * required to carry an "ESCAPE HATCH" comment and is enumerated by
 * escape-hatch.test.ts — see TextFieldDemo/ModalDemo/LightboxDemo. Anything
 * expressible as plain structure (spacing, a `className`) belongs in the
 * `snippet` instead, even inside a `render` override — not left to drift
 * unpinned (see the form block in blocks-section.tsx).
 */
export function Example({
  snippet,
  labels,
  render,
  previewClassName,
}: {
  snippet: Snippet
  labels: ExampleLabels
  render?: ReactNode
  /** Preview-area background override for components styled for a
   *  non-default surface (e.g. `LocaleMenu`/`LocaleSwitcher`, designed for
   *  the dark pine header chrome — illegible on the default paper card). */
  previewClassName?: string
}) {
  const code = codeOf(snippet)

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-paper">
      <div
        className={cn(
          "flex min-h-16 flex-wrap items-center gap-3 p-4",
          previewClassName,
        )}
      >
        {render ?? renderSnippet(snippet, COMPONENTS)}
      </div>
      <CodeDisclosure code={code} labels={labels} />
    </div>
  )
}
