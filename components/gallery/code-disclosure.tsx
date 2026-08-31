"use client"

import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/gallery/copy-button"
import { cn } from "@/lib/cn"

/**
 * T1 (s13-gallery-ergonomics) — the collapsible footer `Example` delegates
 * to: a live preview stays visible above, the code underneath is collapsed
 * by default behind a "Voir le code" toggle. State is local to each mounted
 * `CodeDisclosure` (`useState`) — React gives every instance its own state
 * by construction, so opening one item's code never opens another's.
 *
 * The design system (docs/design-system.md) has no Disclosure/Accordion
 * primitive to compose — reported as a design-system gap in the story
 * report, not filled freestyle. This wrapper only composes `Button` for its
 * trigger, same precedent as `ModalDemo`/`LightboxDemo`/`GalleryThemeToggle`:
 * a small client wrapper holding local UI state, not a new primitive.
 *
 * T2 decision — the `<code>` block stays IN THE DOM AT ALL TIMES. Collapsed
 * is a CSS `hidden` class flip on the panel, never a conditional return of
 * `null` when closed, which would unmount it. s12 pins "chaque item expose son
 * JSX" by counting `<code>` blocks in the served HTML (54 across 15
 * components); unmounting until expanded would drop that count and make the
 * guarantee false unless the check were rewritten to count toggles instead —
 * a deliberate choice this story does not make. Keeping the markup mounted
 * (a few hundred bytes of hidden text per item) is the cheaper trade.
 *
 * T3 decision — the copy trigger lives in the ALWAYS-VISIBLE header row,
 * next to the show/hide toggle, not inside the collapsed panel. Copying a
 * snippet without reading it first (grab-and-paste) is a real workflow;
 * gating copy behind "expand first" would be a regression in ergonomics,
 * not an improvement.
 */
export function CodeDisclosure({
  code,
  labels,
}: {
  code: string
  labels: { copy: string; copied: string; codeShow: string; codeHide: string }
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  if (!code.trim()) return null

  return (
    <div className="border-t border-line bg-fill">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <Button
          type="button"
          variant="subtle"
          size="sm"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
        >
          {open ? labels.codeHide : labels.codeShow}
        </Button>
        <CopyButton
          code={code}
          labels={{ copy: labels.copy, copied: labels.copied }}
        />
      </div>
      <div id={panelId} className={cn("px-4 pb-3", open ? "block" : "hidden")}>
        <pre className="min-w-0 overflow-x-auto whitespace-pre font-mono text-xs text-muted">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  )
}
