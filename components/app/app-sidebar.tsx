"use client"

import { type ReactNode, useState } from "react"
import { useTranslations } from "next-intl"
import { Logo } from "@/components/brand/logo"
import { useAppUser } from "@/components/app/app-shell"
import { Link, usePathname } from "@/i18n/navigation"
import { useLogout } from "@/lib/hooks/use-logout"
import { cn } from "@/lib/cn"

// 16×16 line icons ported from the maquette (stroke = currentColor).
const ICONS: Record<string, ReactNode> = {
  dashboard: (
    <>
      <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    </>
  ),
  settings: (
    <>
      <circle cx="8" cy="8" r="2.4" />
      <circle cx="8" cy="8" r="6" />
    </>
  ),
}

const ITEMS = [
  { key: "dashboard", href: "/dashboard" },
  { key: "settings", href: "/settings" },
] as const

function NavIcon({ name }: { name: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  )
}

/** Sidebar inner content — shared by the desktop aside and the mobile drawer. */
export function SidebarNav({
  collapsed = false,
  onToggleCollapse,
  onNavigate,
}: {
  collapsed?: boolean
  onToggleCollapse?: () => void
  onNavigate?: () => void
}) {
  const t = useTranslations("appNav")
  // Nom, initiales et email réels de l'utilisateur connecté.
  const { name, initials, photoUrl, email } = useAppUser()
  const displayName = name ?? t("accountFallback")
  // Avatar : la photo de profil si elle existe, sinon les initiales.
  const avatar = photoUrl ? (
    <span
      role="img"
      aria-label={displayName}
      className="h-full w-full bg-cover bg-center"
      style={{ backgroundImage: `url("${photoUrl}")` }}
    />
  ) : (
    initials
  )
  const pathname = usePathname()
  const { logout, signingOut } = useLogout()

  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        {/* Top: logo + collapse toggle */}
        <div
          className={cn(
            "flex items-center px-2",
            collapsed ? "flex-col gap-2" : "justify-between",
          )}
        >
          <Logo withWordmark={!collapsed} />
          {onToggleCollapse ? (
            <div className="group relative">
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label={collapsed ? t("expand") : t("collapse")}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-paper/15 bg-paper/10 text-paper transition-colors hover:bg-paper/20"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className={cn(
                    "transition-transform",
                    collapsed && "rotate-180",
                  )}
                >
                  <path d="M10 3.5 5.5 8 10 12.5" />
                </svg>
              </button>
              <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-md bg-pine-900 px-2.5 py-1.5 text-xs font-medium text-paper opacity-0 shadow-float transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100">
                {collapsed ? t("expand") : t("collapse")}
              </span>
            </div>
          ) : null}
        </div>

        <nav className="mt-8 space-y-1">
          {ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={collapsed ? t(item.key) : undefined}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-lg py-2 text-sm transition-colors",
                  collapsed ? "justify-center px-0" : "px-3",
                  active
                    ? "bg-lime font-semibold text-pine"
                    : "font-medium text-on-pine hover:bg-paper/5 hover:text-paper",
                )}
              >
                <NavIcon name={item.key} />
                {collapsed ? (
                  <span className="pointer-events-none absolute left-full z-50 ml-3 -translate-x-1 whitespace-nowrap rounded-md bg-pine-900 px-2.5 py-1.5 text-xs font-medium text-paper opacity-0 shadow-float transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100">
                    {t(item.key)}
                  </span>
                ) : (
                  t(item.key)
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-2.5">
        {/* User badge + logout */}
        {collapsed ? (
          <Link
            href="/settings"
            onClick={onNavigate}
            title={displayName}
            className="mx-auto flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-paper/10 font-display text-xs font-semibold text-paper transition-colors hover:bg-paper/20"
          >
            {avatar}
          </Link>
        ) : (
          <div className="flex items-center gap-2.5 px-1 py-1">
            <Link
              href="/settings"
              onClick={onNavigate}
              className="flex h-[30px] w-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-paper/10 font-display text-xs font-semibold text-paper transition-colors hover:bg-paper/20"
            >
              {avatar}
            </Link>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-xs font-medium text-paper">
                {displayName}
              </p>
              {email ? (
                <p className="truncate text-xs text-on-pine">{email}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={logout}
              disabled={signingOut}
              title={t("logout")}
              aria-label={t("logout")}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-on-pine transition-colors hover:bg-paper/10 hover:text-paper disabled:opacity-50"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 14H3.5A1.5 1.5 0 0 1 2 12.5v-9A1.5 1.5 0 0 1 3.5 2H6" />
                <path d="M10.5 11 14 8l-3.5-3M14 8H6.5" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Doit matcher SIDEBAR_COOKIE côté layout serveur.
const SIDEBAR_COOKIE = "app_sidebar_collapsed"

export function AppSidebar({
  initialCollapsed = false,
}: {
  initialCollapsed?: boolean
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const toggle = () =>
    setCollapsed((c) => {
      const next = !c
      // Persiste la préférence (1 an). Relu côté serveur au prochain chargement.
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`
      return next
    })
  return (
    <aside
      className={cn(
        "light-scope hidden shrink-0 self-start bg-pine px-4 py-6 transition-[width] duration-200 md:sticky md:top-0 md:z-40 md:block md:h-dvh",
        collapsed ? "w-20" : "w-56",
      )}
    >
      <SidebarNav collapsed={collapsed} onToggleCollapse={toggle} />
    </aside>
  )
}
