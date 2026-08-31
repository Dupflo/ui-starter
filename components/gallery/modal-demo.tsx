"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Modal, sizes } from "@/components/ui/modal"
import { Text } from "@/components/ui/text"

/**
 * `Modal` is controlled (`open`/`onClose`) and mounts a portal-like overlay —
 * it needs a trigger to be shown at all, and that trigger needs local state.
 * This is a documented exception to the Snippet/Example derivation (T3):
 * there is no single leaf prop set that meaningfully represents "a modal",
 * so this wrapper is hand-composed rather than snippet-driven.
 *
 * T4 (s13-gallery-ergonomics) — one real, openable trigger PER size, instead
 * of a single generic trigger plus the size names printed as static text
 * (the s12-era version, which never actually showed a size). The size list
 * is `Object.keys(sizes)` over the real map `components/ui/modal.tsx`
 * exports, iterated HERE rather than by the caller: `components/ui/modal.tsx`
 * carries its own `"use client"` directive, and a Server Component
 * (`primitives-section.tsx`) reading a plain data export of a "use client"
 * module at render time gets an opaque client reference, not the real
 * object — proven empirically (a `DEMO_MODE=1` build showed `sizeLabels: []`
 * in the served RSC payload when the enumeration lived there). `ModalDemo`
 * is already client code, so importing `sizes` here is the same boundary
 * s12's original version already relied on (`Object.keys(sizes).join(" · ")`).
 * `triggerLabelTemplate` carries the raw (unformatted) i18n string with a
 * literal `{size}` placeholder — `t.raw()` in page.tsx, not `t()`, so no
 * ICU interpolation happens server-side; the substitution happens here,
 * once per size.
 */
export function ModalDemo({
  triggerLabelTemplate,
  title,
  body,
}: {
  triggerLabelTemplate: string
  title: string
  body: string
}) {
  const [openSize, setOpenSize] = useState<keyof typeof sizes | null>(null)

  return (
    <div className="flex flex-wrap items-center gap-3">
      {Object.keys(sizes).map((size) => (
        <Button
          key={size}
          type="button"
          variant="primary"
          size="sm"
          onClick={() => setOpenSize(size as keyof typeof sizes)}
        >
          {triggerLabelTemplate.replace("{size}", size)}
        </Button>
      ))}
      <Modal
        open={openSize !== null}
        onClose={() => setOpenSize(null)}
        title={title}
        size={openSize ?? "md"}
      >
        <Text size="sm" leading>
          {body}
        </Text>
      </Modal>
    </div>
  )
}
