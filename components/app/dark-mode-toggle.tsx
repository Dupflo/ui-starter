"use client"

import { useTranslations } from "next-intl"
import { useDarkMode } from "@/components/app/app-shell"

/** Sun/moon toggle for the app-shell dark mode (lives in the top bar). */
export function DarkModeToggle() {
  const { dark, toggle } = useDarkMode()
  const t = useTranslations("appNav")

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? t("themeLight") : t("themeDark")}
      title={dark ? t("themeLight") : t("themeDark")}
      className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-line bg-paper text-muted transition-colors hover:text-pine"
    >
      {dark ? (
        // Sun — switch back to light
        <svg
          width="15"
          height="15"
          viewBox="0 0 15 15"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          aria-hidden="true"
        >
          <circle cx="7.5" cy="7.5" r="3.2" />
          <path
            d="M7.5 1v1.4M7.5 12.6V14M1 7.5h1.4M12.6 7.5H14M3 3l1 1M11 11l1 1M12 3l-1 1M4 11l-1 1"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        // Moon — switch to dark
        <svg
          width="15"
          height="15"
          viewBox="0 0 15 15"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          aria-hidden="true"
        >
          <path
            d="M12.5 8.6A5.2 5.2 0 0 1 6.4 2.5a5.2 5.2 0 1 0 6.1 6.1z"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}
