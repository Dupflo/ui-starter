import createMiddleware from "next-intl/middleware"
import { createServerClient } from "@supabase/ssr"
import type { User } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"
import { routing } from "./i18n/routing"
import { isDemoMode } from "@/lib/demo/flag"
import {
  DEMO_SESSION_COOKIE,
  parseDemoSession,
} from "@/lib/demo/session-cookie"

const intlMiddleware = createMiddleware(routing)

// Routes du groupe (app) (sans le préfixe de locale). Tout le reste est public.
// /admin: auth layer only — the role gate (admin-only) is enforced in the page, not here.
const PROTECTED = ["/dashboard", "/settings", "/admin"]

const LOCALE_PREFIX = /^\/(fr|en)(?=\/|$)/

export default async function proxy(request: NextRequest) {
  // 1. next-intl gère le routing de locale et produit la réponse de base.
  const response = intlMiddleware(request)

  // 2. Identité : en mode démo, on la lit dans le cookie de session démo et
  // on s'arrête là — AVANT même de construire le client Supabase réel.
  // s11-demo-mode (T5, fix critique review) : `isDemoMode()` est
  // fail-closed (lib/demo/flag.ts), donc hors démo ce `if` est un pur no-op
  // et le chemin réel ci-dessous (créer le client PUIS appeler getUser,
  // sans rien entre les deux) reste exactement celui qu'AGENTS.md impose.
  //
  // Le cookie (pas un état en mémoire du module) est la seule source
  // possible ici : le middleware compile dans un graphe de modules SÉPARÉ
  // de celui des server actions (lib/demo/state.ts) — un état en mémoire
  // mutable ne serait jamais vu des deux côtés. `request.cookies` est
  // l'API middleware pour lire ce que le navigateur présente ; on ne
  // l'ÉCRIT jamais ici, seules les actions démo (lib/demo/state.ts) le
  // font.
  // The demo branch carries an email string (or null), the real branch a
  // Supabase `User` (or null) — both sections below only ever check
  // truthiness, never shape, but the variable is typed honestly rather than
  // erased to `unknown`.
  let user: User | string | null

  if (isDemoMode()) {
    const raw = request.cookies.get(DEMO_SESSION_COOKIE)?.value
    user = parseDemoSession(raw).email
  } else {
    // Rafraîchit la session Supabase sur cette réponse (continuité des cookies).
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
      data: { user: realUser },
    } = await supabase.auth.getUser()
    user = realUser
  }

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
