"use client"

import { useLocale, useTranslations } from "next-intl"
import { useTransition } from "react"
import { usePathname, useRouter } from "@/i18n/navigation"
import { routing, LOCALE_LABELS, type Locale } from "@/i18n/routing"
import { cn } from "@/lib/cn"

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("localeSwitcher")
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  return (
    <label className={cn("relative inline-flex items-center", className)}>
      <span className="sr-only">{t("label")}</span>
      <select
        aria-label={t("label")}
        value={locale}
        disabled={isPending}
        onChange={(e) => {
          const next = e.target.value as Locale
          startTransition(() => {
            router.replace(pathname, { locale: next })
          })
        }}
        className="cursor-pointer rounded-full border border-paper/15 bg-transparent py-1.5 pl-3 pr-7 font-mono text-xs uppercase tracking-wide text-paper/70 transition-colors hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/60"
      >
        {routing.locales.map((l) => (
          <option key={l} value={l} className="bg-pine text-paper">
            {l.toUpperCase()} — {LOCALE_LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  )
}
