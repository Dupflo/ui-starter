"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { SidebarNav } from "./app-sidebar"

/**
 * Menu hamburger mobile : fait glisser la nav de l'app depuis la gauche (md:hidden).
 *
 * ⚠️ Le tiroir est rendu dans un PORTAIL vers <body>, et ce n'est pas un détail
 * de style. Ce composant est monté à l'intérieur de l'en-tête de page, qui est
 * `sticky top-0 z-10` — or `sticky` + `z-index` crée un CONTEXTE D'EMPILEMENT.
 * Rendu en place, le `z-50` du tiroir ne valait que dans ce contexte : vu du
 * reste de la page, l'ensemble restait plafonné à z-10. Les cartes CV (z-20)
 * passaient donc par-dessus le menu ouvert — on voyait leurs badges et leurs
 * boutons « Éditer / Télécharger » flotter au milieu du panneau vert.
 *
 * Augmenter le z-index n'y changeait rien : il était prisonnier. Le portail sort
 * le tiroir de l'en-tête et le rattache à <body>, où son z-50 compte vraiment.
 */
export function MobileSidebar() {
  const [open, setOpen] = useState(false)
  // Le portail n'existe qu'au client : on attend le montage pour y toucher.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Le fond de page ne doit pas défiler sous le tiroir ouvert.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  // Échap referme, comme pour toute surface modale.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  const drawer =
    open && mounted && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="overlay-fade absolute inset-0 bg-pine/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div className="overlay-drawer light-scope absolute inset-y-0 left-0 w-64 overflow-y-auto bg-pine px-4 py-6 shadow-drawer">
              <SidebarNav onNavigate={() => setOpen(false)} />
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:text-pine"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
        >
          <path d="M2 4h12M2 8h12M2 12h12" />
        </svg>
      </button>
      {drawer}
    </div>
  )
}
