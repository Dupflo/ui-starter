"use client"

import { useCallback, useEffect } from "react"
import Image from "next/image"
import { cn } from "@/lib/cn"

type LightboxImage = { src: string; alt: string; caption?: string }

type LightboxProps = {
  images: LightboxImage[]
  index: number | null
  onIndex: (i: number) => void
  onClose: () => void
  labels: { close: string; prev: string; next: string }
}

/**
 * Visionneuse plein écran : image agrandie sur voile sombre, navigation
 * précédent/suivant, fermeture au clic sur le fond, à l'Échap ou au bouton.
 * Flèches ← → pour naviguer. `index === null` = fermée.
 */
export function Lightbox({
  images,
  index,
  onIndex,
  onClose,
  labels,
}: LightboxProps) {
  const open = index !== null
  const count = images.length

  const go = useCallback(
    (delta: number) => {
      if (index === null) return
      onIndex((index + delta + count) % count)
    },
    [index, count, onIndex],
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      else if (e.key === "ArrowLeft") go(-1)
      else if (e.key === "ArrowRight") go(1)
    }
    window.addEventListener("keydown", onKey)
    // Verrouille le scroll du body tant que la visionneuse est ouverte.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose, go])

  if (index === null) return null
  const current = images[index]

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-pine-900/80 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label={labels.close}
        onClick={onClose}
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-paper/10 text-paper transition-colors hover:bg-paper/20"
      >
        <CloseIcon />
      </button>

      {count > 1 && (
        <NavButton
          side="left"
          label={labels.prev}
          onClick={(e) => {
            e.stopPropagation()
            go(-1)
          }}
        />
      )}

      <figure
        className="flex max-h-full max-w-3xl flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          key={current.src}
          src={current.src}
          width={1654}
          height={2339}
          alt={current.alt}
          className="h-auto max-h-[80dvh] w-auto rounded-lg shadow-2xl shadow-pine-900/40 ring-1 ring-paper/20"
        />
        {current.caption && (
          <figcaption className="font-mono text-2xs uppercase tracking-caps text-paper/70">
            {current.caption}
          </figcaption>
        )}
      </figure>

      {count > 1 && (
        <NavButton
          side="right"
          label={labels.next}
          onClick={(e) => {
            e.stopPropagation()
            go(1)
          }}
        />
      )}
    </div>
  )
}

function NavButton({
  side,
  label,
  onClick,
}: {
  side: "left" | "right"
  label: string
  onClick: (e: React.MouseEvent) => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-paper/10 text-paper transition-colors hover:bg-paper/20",
        side === "left" ? "left-4" : "right-4",
      )}
    >
      <ChevronIcon dir={side} />
    </button>
  )
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ChevronIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
