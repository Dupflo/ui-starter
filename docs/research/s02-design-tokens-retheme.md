# Research — Story s02-design-tokens-retheme

## The five structuring facts

1. The single token source already exists and is complete: the `@theme` block in `app/globals.css:12-73` (brand, surfaces, semantics, on-pine, fonts, type scale, tracking, shadows, radius) plus `.dark`/`.light-scope` overrides — re-theming is "edit this block", not "build a system".
2. The guard `scripts/check-design-tokens.mjs` only forbids **Tailwind arbitrary-bracket values** (`bg-[#hex]`, `rounded-[…]`, `text-[13px]`, `tracking-[…]`, `shadow-[…]`) via regex on class strings (`scripts/check-design-tokens.mjs:20-47`). It does **NOT** see raw hex in inline `style={{}}`, SVG `fill="#…"`, or bare Tailwind colour words like `bg-white`. The story wants it extended to fail on "une couleur brute (hex/rgb) hors tokens" — that is a real code change, the crux of the story (`docs/stories.md:44`, `docs/stories.md:51`).
3. The guard runs green today at **70 files** and is wired as both `prebuild` and `lint:design` (`package.json:11,15`), so it already mechanically gates the build (ADR 002, `docs/decisions/002-design-tokens-theme-guard.md:11,19`).
4. Real raw-colour survivors the current guard misses exist and are intentional/legitimate: `app/global-error.tsx:48,49,68,69` (inline hex — the error page must render even if the CSS bundle fails to load) and `components/auth/google-button.tsx:52,56,60,64` (Google's fixed brand SVG colours). Plus three `bg-white` surfaces (`components/ui/modal.tsx:87`, `components/auth/auth-shell.tsx:18`, `components/auth/google-button.tsx:48`) that use Tailwind's built-in white and therefore will **not** follow a re-theme — a token (`--color-input: #ffffff`, `app/globals.css:29`) already exists to replace them.
5. Brand tokens are still Applyzi's literal `pine`/`lime`/CV-serif fonts (`app/globals.css:14-17,54-58`); ADR 002 flagged replacing them with **neutral placeholders** as a "plus dur" consequence (`docs/decisions/002-design-tokens-theme-guard.md:20`) — the story's "identity in seconds" promise implies neutralising the starter palette, and the re-theme doc must be written (no README, no re-theme doc exists today).

## Target story

**As a** builder, **I want** to change the whole app palette by editing a single tokens file, **so that** each forked SaaS gets its visual identity in seconds. Complexity scored **3** (`docs/stories.md:35-53`).

Acceptance criteria:

- A single `@theme` token file defines the palette. **Already true** (`app/globals.css:12-73`).
- Editing palette values updates every current component/screen without touching their code; later screens (s04 app-shell, s07 landing) inherit and get re-checked on arrival.
- `npm run lint:design` (`check-design-tokens`) passes **and fails if a raw colour (hex/rgb) is used outside tokens**. **Partially true** — passes today, but does NOT yet fail on raw hex/inline-style/bare colour words.
- A short doc (in `docs/` or README) explains how to re-theme in 1 step. **Missing.**

## Current state of the code

- `app/globals.css:12-73` — the `@theme` block. Real token names (quoted): brand `--color-pine` `#10301e`, `--color-pine-900`, `--color-lime` `#c5f24d`, `--color-ink`; surfaces `--color-paper`, `--color-sand`, `--color-line`, `--color-line-strong`, `--color-muted`, `--color-muted-ink`, `--color-muted-soft`, `--color-fill`, `--color-fill-mute`, `--color-input` `#ffffff`, `--color-success-soft`; semantics `--color-ink-strong`, `--color-link`, `--color-success`, `--color-danger`, `--color-warning`, `--color-warning-soft`; on-pine `--color-on-pine`, `--color-on-pine-bright`; skill-category colours `--color-cat-sector*`, `--color-cat-tools*`, `--color-cat-people*` (CV-artifact leftovers, see traps); fonts `--font-display` "General Sans", `--font-ui` "Geist", `--font-mono`, `--font-serif` "Fraunces", `--font-read` "Newsreader"; `--text-2xs` `0.625rem`; `--tracking-caps` `0.16em`; `--shadow-drawer/-float/-sheet`; `--radius-card` `1.25rem`.
- `.dark` (`app/globals.css:81-96`) and `.light-scope` (`app/globals.css:113-128`) re-pin the semantic surface tokens; `.dark .bg-pine`/`.bg-pine-900` re-pin `--color-paper` bright (`app/globals.css:103-106`). Any re-theme must keep these three registers consistent, not just the base block.
- `scripts/check-design-tokens.mjs` — walks `app`, `components`, `lib` (`ROOTS`, line 16) for `.tsx?/.jsx?` (line 17), skips `node_modules`/`.next` (line 60), applies 5 arbitrary-value regex rules (lines 20-47), prints `✓ … no arbitrary values in 70 files` on success (lines 92-95) or lists violations + exit 1 (lines 98-107).
- Components consume tokens via Tailwind utilities that map to `@theme` names: `fill-lime`/`fill-pine`/`text-lime` (`components/brand/logo.tsx:18-21`), `bg-lime`/`ring-lime`/`text-ink-strong`/`border-line`/`bg-fill` (button, badge, cookie-banner, sidebar…). These **do** re-theme because `lime`/`pine`/etc. are `@theme` tokens.
- `components/app/app-sidebar.tsx:73` inline style is a dynamic `backgroundImage: url(...)` — no colour, clean.

## Anchor points

- **Token edits / palette neutralisation**: `app/globals.css:12-73` (+ `.dark` `81-96`, `.light-scope` `113-128`, the `.dark .bg-pine` re-pin `103-106`). Fonts at `54-58`.
- **Guard extension**: `scripts/check-design-tokens.mjs` — add rules for raw hex/rgb/hsl/oklch literals anywhere in the scanned files (not just bracket syntax) and for bare Tailwind colour words (`white`, `black`, named palettes) so they can't bypass the token layer. Must whitelist the two legitimate raw-colour sites (see traps) or migrate them.
- **Raw-colour sites to migrate or whitelist**: `app/global-error.tsx:48-69`, `components/auth/google-button.tsx:52-64` (SVG), and `bg-white` at `components/ui/modal.tsx:87`, `components/auth/auth-shell.tsx:18`, `components/auth/google-button.tsx:48`.
- **New doc**: `docs/` (e.g. `docs/re-theme.md`) or a new root `README.md` (none exists) — must state the 1-step re-theme.
- **Wiring is already correct**: `package.json:11` (`prebuild`) and `:15` (`lint:design`) — no change needed unless a second script is added.

## Verified APIs / functions

- `scripts/check-design-tokens.mjs` exports nothing; it is a standalone Node script (`#!/usr/bin/env node`) run via `node scripts/check-design-tokens.mjs`. `RULES` array of `{category, re, hint}` (lines 20-47); `walk(dir, acc)` recursive collector (lines 49-67); success message references `files.length` (70) and the five categories (lines 92-95).
- `npm run lint:design` → `node scripts/check-design-tokens.mjs` (`package.json:15`). `npm run prebuild` → same (`package.json:11`), auto-invoked before `next build`.
- Confirmed by running it: `✓ design tokens: no arbitrary values in 70 files (colour, radius, font-size, tracking, shadow).` exit 0.
- `cn()` lives at `@/lib/cn` (`components/brand/logo.tsx:1`) — class-merge helper (clsx + tailwind-merge per package.json deps).
- Tailwind utilities like `bg-lime` resolve to `var(--color-lime)` because Tailwind v4 generates utilities from `@theme` tokens — verified indirectly: `logo.tsx` uses `fill-lime`/`fill-pine` and the guard passes, so these are recognised token utilities, not arbitrary values.

## Traps & constraints

- **The guard's blind spots are the whole point.** Extending the regex to catch raw hex is easy; the trap is false positives. `app/global-error.tsx` inline hex is deliberate (root error boundary renders without the app's CSS — see `app/globals.css` is not guaranteed loaded there). Google's SVG brand colours (`google-button.tsx`) are fixed by Google's brand guidelines and cannot be tokenised. A naive "fail on any `#hex`" breaks both. The plan must decide: an inline `eslint-disable`-style allow-comment, a path allowlist in the script, or migrate global-error to CSS classes and leave Google SVG whitelisted. This design choice is the story's real work.
- **CV-artifact token leftovers**: `--color-cat-sector*/-tools*/-people*` (`app/globals.css:44-51`), `--font-serif`/`--font-read` (`57-58`), `--shadow-sheet` and the CV print block (`app/globals.css:388-416`) are Applyzi CV domain remnants. ADR 001 stripped the CV domain; whether these dead tokens should be removed as part of "neutralising the palette" is a scope question (removing them could break s01 code if still referenced — grep before deleting).
- **Three registers must stay in sync**: base `@theme`, `.dark`, `.light-scope`. Re-theming only the base block leaves dark mode on the old palette. The doc and any neutralisation must address all three.
- **Do not remove the guard from hooks**: ADR 002 explicitly warns to keep the check in `prebuild`/lint-staged (`docs/decisions/002-design-tokens-theme-guard.md:21`). `lint-staged` (`package.json:21-27`) does NOT currently run the design check — only eslint/prettier. Adding it there is optional but consistent with the ADR.
- **No `tailwind.config`** (Tailwind v4 CSS-first) — do not reintroduce one (ADR 002, arch conventions). Tokens live only in `@theme`.
- **s01 code is the surface under test**: 70 files. The AC says editing palette values must update "tous les composants/écrans présents à ce stade" — the `bg-white` surfaces are the counterexample that currently violates this. Fixing them (→ `bg-input` or a new `--color-surface` token) is likely in-scope.
- **No existing test** targets the guard. The guard is a script, not Vitest. A test could assert it exits non-zero on a planted raw-hex fixture, but there is no test harness for `.mjs` scripts today.

## Open questions

- Neutralisation scope: does "identity in seconds" require renaming/replacing the `pine`/`lime`/serif brand tokens with neutral placeholders (ADR 002's "plus dur"), or is the starter allowed to ship with the pine/lime look as its default identity and the story only guarantees the _mechanism_? The AC only mandates the mechanism + guard + doc — neutralisation is implied, not spelled out. Resolve at planning.
- Guard scope for the raw-colour extension: hex only, or also `rgb()/hsl()/oklch()` and bare colour words (`bg-white`, `text-black`)? The AC text says "hex/rgb"; the `bg-white` surfaces argue for catching bare words too. Decide the exact rule set.
- Allow-mechanism for the two legitimate raw-colour sites: path allowlist vs inline comment vs migration. Pick one.
- Doc home: new root `README.md` vs `docs/re-theme.md`. AC accepts either.
- Should the dead CV tokens (`cat-*`, serif fonts, CV print CSS) be deleted now or left for a later cleanup story?

## Real complexity

**Verdict: 3 (confirmed).** The pre-investigation score holds. The token source already exists and is complete, the wiring already gates the build, and components already consume tokens correctly — so two of the four AC are near-done. The genuine work is bounded and single-threaded: (a) extend one ~100-line Node script to catch raw colours while whitelisting/migrating two legitimate sites, (b) fix ~3 `bg-white` surfaces to a token, optionally neutralise the brand palette across three registers, (c) write a short re-theme doc. No new architecture, no framework, no cross-module coupling, no DB. The only subtlety (guard false positives on global-error + Google SVG) is a design decision, not hidden complexity. Not a 2 because the guard extension has a real correctness trap (whitelisting) and touches build-gating behaviour; not a 4+ because everything lives in one CSS file, one script, and a handful of className swaps. No split needed.
