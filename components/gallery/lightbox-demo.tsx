"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Lightbox } from "@/components/ui/lightbox"

/**
 * `Lightbox` is controlled (`index`/`onIndex`/`onClose`) and needs a
 * trigger with local state — same documented exception as `ModalDemo` (see
 * its comment). `public/gallery/sample.png` is a 1×1 placeholder asset
 * added for this demo only: `next/image` (which `Lightbox` uses
 * internally, with no `unoptimized` escape hatch) rejects SVG by default,
 * and the repo ships no other raster asset to point at.
 */
export function LightboxDemo({
  triggerLabel,
  caption,
  labels,
}: {
  triggerLabel: string
  caption: string
  labels: { close: string; prev: string; next: string }
}) {
  const [index, setIndex] = useState<number | null>(null)

  return (
    <>
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={() => setIndex(0)}
      >
        {triggerLabel}
      </Button>
      <Lightbox
        images={[{ src: "/gallery/sample.png", alt: caption, caption }]}
        index={index}
        onIndex={setIndex}
        onClose={() => setIndex(null)}
        labels={labels}
      />
    </>
  )
}
