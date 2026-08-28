# Research — Story s10-defect-sweep

Branch: `feature/s10-defect-sweep` · Base: `main` @ `4405ea6`

## Origin

Not a greenfield story: a fresh-context audit of `main` on 2026-08-28 (5 adversarial
passes, all gates re-run independently) found defects that crossed the reviews of
s01→s08 unnoticed. All are inherited from the `applyzi-flagship` fork. Each finding
below was reproduced against the real code, not inferred.

## Current state — verified

### 1. Print layer (`app/globals.css:390-417`)

```css
#cv-print {
  display: none;
}
@media print {
  html,
  body {
    background: #fff !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  body > * {
    display: none !important;
  }
  body > #cv-print {
    display: block !important;
  }
  #cv-print .print-page {
    break-inside: avoid;
    break-after: page;
  }
}
```

`git grep cv-print` → only `app/globals.css` and `docs/design-system.md`. The element is
never rendered, so `body > *{display:none}` hides the page and nothing re-shows it.
The block is **deliberately unlayered** (its own comment says so) → it beats every
Tailwind utility. Result: every route prints blank, legal pages included.

`docs/design-system.md` already lists `#cv-print` / `.print-page` / the `@media print`
rules under _Hors périmètre (registre CV strippé — ne pas réintroduire)_. Code and
framing doc disagree today.

### 2. `server-only` hole (`lib/supabase/service-role.ts`)

10 sensitive modules carry the guard — `lib/observability.ts`, `lib/data/identity.ts`,
`lib/data/dashboard.ts`, `lib/data/ensure-profile.ts`, `lib/data/subscription.ts`,
`lib/stripe/config.ts`, `lib/stripe/client.ts` (+ 3 test files). The RLS-bypassing
client does not, though its own docstring says "SERVER-ONLY" and ADR 004 names it
explicitly in its watch list.

`lib/supabase/server.ts:5` re-exports it. Consumers all import from `./service-role`
directly, so the re-export is dead weight that additionally makes the generic server
module transitively server-only once the guard lands.

**Not a phantom import**: `server-only` is absent from `package.json` on purpose —
Next aliases it to `next/dist/compiled/server-only`, and `vitest.config.ts` stubs it.
Verified during the audit: a `"use client"` probe importing the service-role client
fails the build with exit 1 and a Turbopack trace. The guard genuinely fires.

### 3. Invisible wordmark (`app/[locale]/pricing/page.tsx:28-32`)

`<main className="min-h-dvh bg-paper">` … `<Logo />`. `Logo`'s default is
`variant="dark"`, documented "on pine surfaces", which sets the wordmark to
`text-paper`. Both sides resolve to `var(--color-paper)` → contrast 1:1, in light
**and** dark (the token is overridden as a pair). Only the lime tile is visible.

The other three call sites were re-derived from source during the audit and are
correct — `(legal)/layout.tsx`, `auth-shell.tsx` and `app-sidebar.tsx` all sit on
`bg-pine`. `app-sidebar` is correct by construction rather than luck: its `<aside>`
is a _descendant_ of the shell root, so `.dark .bg-pine` (specificity 0,2,0) matches
and beats `.light-scope` (0,1,0). Had `bg-pine` sat on the `.dark` element itself,
the descendant combinator would not match and the wordmark would go 1.02:1.

### 4. Branding residues — 11 hits

`git grep -in applyzi -- app components lib public scripts`:

- `public/favicon.svg` — still the Applyzi mark **and** an XML comment. Renders in the
  browser tab, bookmarks and the PWA install prompt: user-visible brand surface.
- `scripts/backup-prod.sh` — names "la Supabase prod Applyzi" and embeds a real prod
  project ref (`postgres.cabaknozrdvjubxgpyoi`), writing to `./backups/applyzi-prod-*`.
  No secret (password is a placeholder) but a real production identifier in a repo
  meant to be forked. `backups/` is not gitignored either.
- `components/cookie-banner.tsx:9` — docstring.
- `app/globals.css:255` — comment over the onboarding motion layer.
- `components/brand/logo.test.ts:17-20` — legitimate guard regex, keep.

### 5. Webfonts — to determine, not assumed

`app/globals.css:2-3` declares two remote `@import url(...)` (Fontshare General Sans;
Google Fraunces/Newsreader/Geist/Geist Mono). During the audit of the s01 lineage the
emitted stylesheet contained **0 `@import` and 0 `@font-face`**, and `.next/static/media`
did not exist — every `font-display`/`font-ui`/`font-mono` fell back to system fonts.
`main` has since gained s02's token work, so **this must be re-measured on the current
build before deciding anything**. Fraunces and Newsreader are CV-era faces regardless.

Two honest outcomes: make the fonts actually load (`next/font`, self-hosted), or correct
`docs/design-system.md` to describe what ships. Do not leave the doc false.

## Traps

- The print block is unlayered — verify the **emitted** stylesheet, never the source.
- `body` sets `color: var(--color-paper)`. A print reset that forces `background:#fff`
  without forcing `color` reproduces the wordmark bug in another medium.
- `--color-cat-sector*` is used by `components/ui/badge.tsx` — do not delete it with the
  other CV-era `cat-*` tokens.
- Do not add `server-only` to `package.json`.
- `scripts/check-design-tokens.mjs` does not scan `public/`, so a favicon may use raw hex.
  It now also flags raw-hex/raw-colour-fn/bare-palette utilities in `app|components|lib`
  with an allowlist — check it before touching any colour.

## Out of scope

Re-theming (s02 owns the tokens), the 4 inherited `react-hooks/set-state-in-effect`
warnings, locale-blind `window.location` navigation and hardcoded aria-labels (s08),
`/api/cron/ping`'s non-constant-time secret compare.
