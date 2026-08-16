import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin()

const nextConfig: NextConfig = {
  // Allow the dev server to be reached through an ngrok tunnel.
  // NB : les domaines ngrok gratuits récents sont en `.ngrok-free.dev`
  // (et non plus seulement `.ngrok-free.app`) — sans ça, Next bloque le JS
  // client cross-origin en dev et les formulaires partent en submit natif
  // (champs vidés, identifiants en query string).
  allowedDevOrigins: [
    "*.ngrok-free.dev",
    "*.ngrok-free.app",
    "*.ngrok.app",
    "*.ngrok.io",
  ],
}

export default withNextIntl(nextConfig)
