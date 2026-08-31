"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"

type DarkCtx = { dark: boolean; toggle: () => void }
const DarkModeContext = createContext<DarkCtx>({
  dark: false,
  toggle: () => {},
})

/**
 * T7 (s12-ui-gallery) — page-local dark-mode preview. Puts `.dark` on an
 * ancestor div, exactly like `AppShell` does for the real app
 * (docs/design-system.md: dark mode is scoped, never on `<html>`). This is
 * a preview toggle for this page only — it intentionally does not touch
 * `AppShell`'s persisted `localStorage` preference.
 */
export function GalleryThemeScope({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false)
  return (
    <DarkModeContext.Provider
      value={{ dark, toggle: () => setDark((d) => !d) }}
    >
      <div className={cn(dark && "dark")}>{children}</div>
    </DarkModeContext.Provider>
  )
}

/** Sun/moon toggle — reuses appNav's themeDark/themeLight copy (same meaning as AppShell's). */
export function GalleryThemeToggle() {
  const { dark, toggle } = useContext(DarkModeContext)
  const t = useTranslations("appNav")
  return (
    <Button
      type="button"
      variant="subtle"
      size="sm"
      onClick={toggle}
      aria-pressed={dark}
    >
      {dark ? t("themeLight") : t("themeDark")}
    </Button>
  )
}
