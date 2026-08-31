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
 *
 * T5 (s13-gallery-ergonomics) — `Lightbox` exports no discrete-variant
 * table (no `sizes`/`tones`-shaped export) to enumerate one trigger per
 * value from, unlike Modal's `sizes` (T4): its only axis is the `images`
 * array, and prev/next (`NavButton`s) only render once `images.length > 1`
 * (components/ui/lightbox.tsx). That axis needs no new asset to
 * demonstrate: `images` is a plain array and `go()` wraps with
 * `(index + delta + count) % count`, so the one shipped `sample.png` is
 * listed twice, with distinct captions — prev/next now actually cycles
 * between two real slides instead of being unreachable behind a
 * single-image array. (Review fix, s13-gallery-ergonomics minor 3: an
 * earlier version of this comment invented a blocker — a new image asset —
 * that this reuse of the existing one proves was never necessary.)
 */
export function LightboxDemo({
  triggerLabel,
  caption,
  captionAlt,
  labels,
}: {
  triggerLabel: string
  caption: string
  captionAlt: string
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
        images={[
          { src: "/gallery/sample.png", alt: caption, caption },
          { src: "/gallery/sample.png", alt: captionAlt, caption: captionAlt },
        ]}
        index={index}
        onIndex={setIndex}
        onClose={() => setIndex(null)}
        labels={labels}
      />
    </>
  )
}
