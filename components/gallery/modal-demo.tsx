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
 * so this wrapper is hand-composed rather than snippet-driven. It iterates
 * the real `sizes` map from `components/ui/modal.tsx` (T1) so the size list
 * shown here cannot drift from the primitive's actual sizes.
 */
export function ModalDemo({
  triggerLabel,
  title,
  body,
}: {
  triggerLabel: string
  title: string
  body: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </Button>
      <Text size="xs" as="span">
        {Object.keys(sizes).join(" · ")}
      </Text>
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <Text size="sm" leading>
          {body}
        </Text>
      </Modal>
    </div>
  )
}
