import createMiddleware from "next-intl/middleware"
import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"
import { routing } from "./i18n/routing"

const intlMiddleware = createMiddleware(routing)

// Routes du groupe (app) (sans le préfixe de locale). Tout le reste est public.
// /admin: auth layer only — the role gate (admin-only) is enforced in the page, not here.
const PROTECTED = ["/dashboard", "/settings", "/admin"]

const LOCALE_PREFIX = /^\/(fr|en)(?=\/|$)/

export default async function proxy(request: NextRequest) {
  // 1. next-intl gère le routing de locale et produit la réponse de base.
  const response = intlMiddleware(request)

  // 2. Rafraîchit la session Supabase sur cette réponse (continuité des cookies).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Ne RIEN exécuter entre createServerClient et getUser (évite les déconnexions aléatoires).
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const prefix = path.match(LOCALE_PREFIX)?.[0] ?? ""
  const stripped = path.replace(LOCALE_PREFIX, "") || "/"

  // 3a. Routes (app) sans session → /login (en gardant la locale + la cible).
  const isProtected = PROTECTED.some(
    (p) => stripped === p || stripped.startsWith(`${p}/`),
  )
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = `${prefix}/login`
    url.search = `?redirect=${encodeURIComponent(path)}`
    return NextResponse.redirect(url)
  }

  // 3b. Déjà connecté sur /login ou /signup → dashboard.
  if (user && (stripped === "/login" || stripped === "/signup")) {
    const url = request.nextUrl.clone()
    url.pathname = `${prefix}/dashboard`
    url.search = ""
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
}
