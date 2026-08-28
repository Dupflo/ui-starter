import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google"

/**
 * Self-hosted app fonts (s10-defect-sweep T6).
 *
 * The two remote `@import url(...)` this replaced never survived the
 * production build (0 `@font-face`, 0 `@import` in the emitted stylesheet) —
 * every `font-display`/`font-ui`/`font-mono` utility silently fell back to
 * system fonts. Loading through `next/font/google` self-hosts the files at
 * build time: zero request to a third-party font CDN (RGPD, perf, CSP), and
 * a font that's actually there.
 *
 * General Sans (Fontshare) was tried first via `next/font/local`, then
 * reverted: the ITF Free Font License names "repository" among the forbidden
 * distribution channels for the raw font files, and forbids the subsetting/
 * format conversion `next/font/local` performs — a starter meant to be
 * forked is exactly the prohibited case. Plus Jakarta Sans (OFL, on Google
 * Fonts) replaces it — next/font/google self-hosts it at build time and
 * nothing is committed, so the licence conflict cannot recur in any fork.
 *
 * Each loader exposes a `--font-*` CSS variable (applied to `<html>` in
 * app/[locale]/layout.tsx); `@theme` in app/globals.css resolves the
 * `font-display` / `font-ui` / `font-mono` design tokens through those
 * variables, so the token names consumed across the app are unchanged.
 */

// Weights match what the design system asks of font-display (500/600/700).
export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
})

export const geist = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-geist",
  display: "swap",
})

export const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-geist-mono",
  display: "swap",
})
