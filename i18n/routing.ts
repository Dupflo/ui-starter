import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  // Default locale (fr) served without prefix; others get /en.
  localePrefix: "as-needed",
})

export type Locale = (typeof routing.locales)[number]

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
}
