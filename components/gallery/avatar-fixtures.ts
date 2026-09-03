/**
 * T4 (s18-ui-kit-polish) — demo images for the `Avatar` primitive's gallery
 * examples and the "Utilisateurs" block: inline SVG data-URIs, never a file
 * under `public/` (human decision, docs/plans/s18-ui-kit-polish.md
 * "Decision already taken": every `public/` file ships in every fork of
 * this starter, while the gallery only exists in dev and demo mode).
 *
 * `TOKEN_HEX` — literal hex, deliberately, not `var(--color-…)`: a data-URI
 * SVG rendered inside an `<img>` is an isolated document with no access to
 * the parent page's CSS custom properties, so a `var(--color-pine)` inside
 * it resolves to nothing (verified live — see the story report). Copied
 * from app/globals.css's `@theme` block (light-mode values; a demo image is
 * a static asset, like a real uploaded photo would be — it does not
 * repaint on the dark-mode toggle, only the initials FALLBACK does, via its
 * `bg-fill`/`text-ink` token utility classes in avatar.tsx).
 *
 * `check-design-tokens` (scripts/check-design-tokens.mjs) walks
 * app|components|lib for exactly this raw-hex pattern and WOULD flag every
 * line below — correctly: these genuinely are literal hex values. They are
 * allowlisted via the script's own `design-tokens-allow` sentinel, the same
 * mechanism already used for components/auth/google-button.tsx's brand
 * colours — not a workaround, the tool's own documented escape hatch for a
 * narrow, justified case. avatar-fixtures.test.ts cross-reads these against
 * app/globals.css so a token value drifting there cannot silently drift
 * here; the ACTUAL colours were additionally checked on the real rendered
 * page (see the story report) — a green lint or a green source-level test
 * is not proof by itself (the exact trap the s14 Recharts default-colour
 * near-miss demonstrated: this lint cannot see inside an encoded string).
 */
export const TOKEN_HEX = {
  // design-tokens-allow: literal hex required — data-URI SVG has no access
  // to CSS custom properties (see the module doc comment above)
  success: "#1f8a4c",
  // design-tokens-allow: literal hex required — same reason as `success` above
  warning: "#c9810a",
  // design-tokens-allow: literal hex required — same reason as `success` above
  paper: "#f9f9fb",
} as const

/** A circular, initials-style SVG avatar — the same visual idea a real
 *  avatar-generation service (Gravatar, DiceBear…) would serve, built here
 *  from two token colours instead of fetched over the network. */
function tokenAvatarDataUri(bg: string, fg: string, label: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="32" fill="${bg}"/>` +
    `<text x="32" y="41" text-anchor="middle" font-family="system-ui, sans-serif" ` +
    `font-size="24" font-weight="600" fill="${fg}">${label}</text>` +
    `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/**
 * Two token-coloured demo images, for the "Utilisateurs" block's
 * `avatarSrc` rows (components/gallery/data-table-users-demo.tsx — two of
 * its four rows use one of these, the other two are left without an
 * `avatarSrc` on purpose, to demonstrate `Avatar`'s initials fallback in the
 * same table). `camille` is reused, unchanged, by the standalone `Avatar`
 * primitive demo (components/gallery/primitives-section.tsx) — same person,
 * so the visible "CG" disc matches the accessible name ("Camille Girard")
 * in both places; a second, differently-labelled fixture there would teach
 * the wrong lesson about what the primitive does.
 *
 * Neither uses (the now-removed) `TOKEN_HEX.pine` as a background:
 * `--color-pine` is unchanged between light and dark mode (app/globals.css),
 * while dark mode's `--color-paper` (card surface) lands close enough to it
 * that a pine disc on a dark card nearly disappears — since this SVG is a
 * static asset that (deliberately, see the module doc comment above) never
 * repaints for the dark-mode toggle. `success`/`warning` both stay legible
 * against both `paper` values (measured on the rendered page — see the
 * story report).
 */
export const AVATAR_DEMO_IMAGES = {
  camille: tokenAvatarDataUri(TOKEN_HEX.warning, TOKEN_HEX.paper, "CG"),
  yanis: tokenAvatarDataUri(TOKEN_HEX.success, TOKEN_HEX.paper, "YC"),
} as const
