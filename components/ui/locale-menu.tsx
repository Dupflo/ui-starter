"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useLocale, useTranslations } from "next-intl"
import { usePathname, useRouter } from "@/i18n/navigation"
import { routing, LOCALE_LABELS, type Locale } from "@/i18n/routing"
import { cn } from "@/lib/cn"

// Drapeau par locale (EN = Royaume-Uni). Emoji = texte, pas d'asset.
const FLAGS: Record<Locale, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
}

/**
 * Sélecteur de langue « riche » (globe + drapeau + chevron) avec un menu déroulant
 * clair listant les langues drapeau + libellé. Conçu pour le header sombre de la
 * landing : déclencheur clair sur fond pine, popover blanc. Change la locale en
 * conservant le chemin courant.
 */
export function LocaleMenu({ className }: { className?: string }) {
  const t = useTranslations("localeSwitcher")
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const pick = (next: Locale) => {
    setOpen(false)
    if (next === locale) return
    startTransition(() => {
      router.replace(pathname, { locale: next })
    })
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={t("label")}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={isPending}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full border border-paper/15 py-1.5 pl-3 pr-2.5 text-paper/75 transition-colors hover:border-paper/30 hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/60 disabled:opacity-60"
      >
        {/* Globe */}
        <svg
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="6.5" />
          <path d="M1.5 8h13M8 1.5c1.8 1.7 2.8 4 2.8 6.5S9.8 12.8 8 14.5C6.2 12.8 5.2 10.5 5.2 8S6.2 3.2 8 1.5z" />
        </svg>
        <span className="text-base leading-none">{FLAGS[locale]}</span>
        {/* Chevron */}
        <svg
          width="11"
          height="11"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={cn("transition-transform", open && "rotate-180")}
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-44 overflow-hidden rounded-xl border border-line bg-paper py-1.5 shadow-float"
        >
          {routing.locales.map((l) => {
            const active = l === locale
            return (
              <button
                key={l}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => pick(l)}
                className={cn(
                  "flex w-full items-center gap-3 px-3.5 py-2 text-left text-sm transition-colors",
                  active
                    ? "font-semibold text-ink-strong"
                    : "text-ink hover:bg-fill",
                )}
              >
                <span className="text-base leading-none">{FLAGS[l]}</span>
                {LOCALE_LABELS[l]}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
