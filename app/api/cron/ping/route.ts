import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Ping de maintien en vie de Supabase. Le projet est sur l'offre gratuite :
 * Supabase met un projet en PAUSE après 7 jours sans activité (et une reprise
 * est manuelle → le site tombe). Une requête triviale programmée suffit à
 * réarmer le compteur.
 *
 * Auth : `Authorization: Bearer <secret>`, accepté si le secret vaut
 * SUPABASE_PING_SECRET **ou** CRON_SECRET — Vercel Cron envoie automatiquement
 * `Bearer $CRON_SECRET`, tandis qu'un pinger externe (UptimeRobot, cron-job.org)
 * utilisera SUPABASE_PING_SECRET. Sans secret configuré → 503 (jamais ouvert).
 *
 * Lecture seule, service role, `head: true` → aucune donnée ne transite.
 */
export async function GET(req: Request) {
  const expected = [
    process.env.SUPABASE_PING_SECRET,
    process.env.CRON_SECRET,
  ].filter((s): s is string => !!s && s.length > 0)

  if (expected.length === 0) {
    return NextResponse.json({ error: "ping_not_configured" }, { status: 503 })
  }

  const header = req.headers.get("authorization")
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null
  if (!token || !expected.includes(token)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const supabase = createServiceRoleClient()
    // `head: true` + count exact : touche la base sans rapatrier de ligne.
    const { error, count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true, profiles: count ?? 0 })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error("[cron/ping] échec:", detail)
    return NextResponse.json({ error: "ping_failed", detail }, { status: 500 })
  }
}
