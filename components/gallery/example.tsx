import { Fragment, type ReactNode } from "react"
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
 * underneath. Server component — the only client bit reached is
 * `CodeDisclosure` (s13-gallery-ergonomics: collapsed by default, per-item
 * state, still delegates to `CopyButton`). There is no bypass: every
 * registered component reaches this (review fix, s12-ui-gallery — `Modal`,
 * `Lightbox`, `LocaleMenu`, `LocaleSwitcher` used to render outside
 * `Example` entirely and had none).
 *
 * The single-item case of `GroupedExample` below — see that doc comment for
 * the shell both share. `render` is an explicit, narrow escape hatch for
 * the few cases where the default `renderSnippet(snippet)` cannot be used:
 * React refuses `ref`-bearing props (e.g. `TextField`'s react-hook-form
 * `registration`) inside a Server Component render pass, and
 * `Modal`/`Lightbox` need local open/close state and a trigger, which a
 * static snippet render cannot provide. Each such usage is required to
 * carry an "ESCAPE HATCH" comment and is enumerated by escape-hatch.test.ts
 * — see TextFieldDemo/ModalDemo/LightboxDemo. Anything expressible as plain
 * structure (spacing, a `className`) belongs in the `snippet` instead, even
 * inside a `render` override — not left to drift unpinned (see the form
 * block in blocks-section.tsx).
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
  return (
    <GroupedExample
      items={[{ snippet, render }]}
      labels={labels}
      previewClassName={previewClassName}
    />
  )
}

/**
 * s15-gallery-feedback (annotation `mtit5zbxei1`) — "on peut grouper
 * plusieurs badge ensemble et affiche le code en une fois". `Badge`/`Button`
 * used to render one `<Example>` PER VARIANT (10 and 11 respectively): its
 * own bordered card, its own "Voir le code", its own "Copier" — for a
 * single component. `GroupedExample` is the N-item generalisation of
 * `Example`'s shell: every item's live render shares ONE preview row, and
 * every item's `codeOf(snippet)` is joined into the ONE `CodeDisclosure`
 * beneath it — so a reader still sees every variant live, and still gets
 * every variant's exact JSX, just not as ten separate cards.
 *
 * `Example` (above) is this function's N=1 case, not a parallel
 * implementation: there is exactly one place that renders a preview row and
 * exactly one place that builds a `CodeDisclosure`'s `code` prop, so a
 * single-item call site and a grouped one cannot drift from each other by
 * construction — same reasoning as `codeOf`/`renderSnippet` sharing one
 * `Snippet` (see snippet.ts's header).
 */
export function GroupedExample({
  items,
  labels,
  previewClassName,
}: {
  items: readonly {
    snippet: Snippet
    render?: ReactNode
    /** s15-gallery-feedback (follow-up) — per-ITEM surface patch, distinct
     *  from the group-level `previewClassName` below. Some variants of a
     *  grouped component are designed for a surface other than the
     *  preview row's default `bg-paper` (e.g. `Button`'s `outline`/`ghost`:
     *  `text-paper` with no background of their own — legible only on the
     *  dark `pine` chrome, invisible otherwise; see surface-contrast.ts and
     *  the third occurrence note there). Recolouring the whole group would
     *  wrongly change every OTHER variant in the same row; this wraps only
     *  that one item in a small patch of its own background instead. */
    previewClassName?: string
  }[]
  labels: ExampleLabels
  previewClassName?: string
}) {
  const code = items.map((item) => codeOf(item.snippet)).join("\n\n")

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-paper">
      <div
        className={cn(
          "flex min-h-16 flex-wrap items-center gap-3 p-4",
          previewClassName,
        )}
      >
        {items.map((item, i) => {
          const rendered =
            item.render ?? renderSnippet(item.snippet, COMPONENTS)
          return (
            <Fragment key={i}>
              {item.previewClassName ? (
                <span
                  className={cn(
                    "inline-flex items-center rounded-lg p-1.5",
                    item.previewClassName,
                  )}
                >
                  {rendered}
                </span>
              ) : (
                rendered
              )}
            </Fragment>
          )
        })}
      </div>
      <CodeDisclosure code={code} labels={labels} />
    </div>
  )
}
