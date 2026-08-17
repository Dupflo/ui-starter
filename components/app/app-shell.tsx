"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { AppSidebar } from "@/components/app/app-sidebar"
import { cn } from "@/lib/cn"

type DarkCtx = { dark: boolean; toggle: () => void }

const DarkModeContext = createContext<DarkCtx>({
  dark: false,
  toggle: () => {},
})
export const useDarkMode = () => useContext(DarkModeContext)

// Identité réelle de l'utilisateur (fournie par le (app) layout), lue par le
// chrome : serveur -> contexte -> composants.
type AppUser = {
  name: string | null
  initials: string
  /** Photo de profil (URL publique) — affichée dans l'avatar si présente. */
  photoUrl?: string | null
  /** Adresse e-mail réelle — affichée sous le nom dans le badge étendu. */
  email?: string | null
}
const UserContext = createContext<AppUser>({
  name: null,
  initials: "?",
  photoUrl: null,
  email: null,
})
export const useAppUser = () => useContext(UserContext)

const STORAGE_KEY = "app-theme"

/**
 * App-shell root. Owns the dark-mode flag (persisted to localStorage) and
 * applies `.dark` to the shell only — marketing/auth pages stay light.
 */
export function AppShell({
  children,
  user = { name: null, initials: "?" },
  sidebarCollapsed = false,
}: {
  children: React.ReactNode
  user?: AppUser
  /** État replié initial de la sidebar (lu depuis le cookie côté serveur). */
  sidebarCollapsed?: boolean
}) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(localStorage.getItem(STORAGE_KEY) === "dark")
  }, [])

  const toggle = () =>
    setDark((d) => {
      const next = !d
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light")
      return next
    })

  return (
    <DarkModeContext.Provider value={{ dark, toggle }}>
      <UserContext.Provider value={user}>
        <div className={cn("flex min-h-screen bg-pine", dark && "dark")}>
          <AppSidebar initialCollapsed={sidebarCollapsed} />
          <main className="min-w-0 flex-1 overflow-hidden bg-sand text-ink md:m-3 md:rounded-2xl">
            {children}
          </main>
        </div>
      </UserContext.Provider>
    </DarkModeContext.Provider>
  )
}
