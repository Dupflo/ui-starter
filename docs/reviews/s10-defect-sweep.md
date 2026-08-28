# Review — Story s10-defect-sweep

> Fresh-context reviewer subagent. Diff judged: `git diff origin/main...feature/s10-defect-sweep`
> (`origin/main` = `e03e517`, s09 merged). Branch was rebased after s09 landed, so the combination
> reviewed had never been built by its author — one conflict (`public/favicon.svg`) was hand-resolved.
> All gates re-run by the reviewer after `rm -rf .next`.

## Gates — run by the reviewer

```
npm run test        27 files / 189 tests passed        (208/30 after the fix commit)
npm run lint:design ✓ no arbitrary values, 92 files (12 allowlisted)
npm run typecheck   exit 0
npm run build       ✓ 29/29 static pages, exit 0
npm run lint        ✖ 4 problems (0 errors, 4 warnings) — pre-existing, tolerated by the plan
```

Commit test counts verified honest: `a376347` claimed 138/26, true pre-rebase; s09 contributes
exactly 51 tests in 1 file, and 138+51 = 189, 26+1 = 27. No invented number.

## The claims — each broken rather than read

**1. Print layer.** Emitted stylesheet: `cv-print` hits **0**, one `@media print` block,
no `body > *` rule. `--color-paper` `#f9f9fb` / `--color-ink` `#161616` at `:root`, and `.dark`
sits on a div inside `<body>`, never on `<html>` — so the print reset resolves to the light pair
(≈17:1). The `body{color:var(--color-paper)}` trap is genuinely handled.

**2. `server-only` guard fires.** A throwaway `"use client"` probe importing
`createServiceRoleClient`, wired into the layout, fails the build with exit 1 and a Turbopack
client-boundary trace. Probe removed, tree verified clean. Not a silent no-op. `server-only`
correctly absent from `package.json` (Next aliases it; vitest stubs it).

**3. Wordmark — 5 call sites re-derived from source**, one more than the research listed
(s07's landing header). No site has the wordmark token equal to its container token, in light
or dark. The `app-sidebar` specificity claim holds: built CSS has `.dark .bg-pine{--color-paper:#f9faf9}`
(0,2,0) beating `.light-scope` (0,1,0), and `.dark` is on an ancestor div, so the descendant
combinator matches — correct by construction, not by source order.

**4. Fonts.** `git ls-files | grep -i woff` empty. Emitted: **42** `@font-face`, **0** `@import`,
**0** `https?://` — in the CSS _and_ in the served HTML. `.next/static/media`: 15 woff2, preloaded.
The commit's 33→42 / 14→15 before/after numbers reproduce exactly.

**5. `public/` guard bites.** `touch public/probe-guard.ts` → red; `public/nested/deep/a.test.tsx`
→ red (recursion works); removed → green. Real `next start` + curl: `/favicon.test.ts` **404**,
`/public-assets.test.ts` **404**, `/favicon.svg` **200**.

**6. `docs/design-system.md`.** All **24** colour rows checked line-by-line against the current
`@theme`: every one matches. Zero hue adjectives left in prose.

**Test bite proven by neutralization** — 6 mutations, 6 targeted reds, all restored clean:
print `color` removed · `body > *` reintroduced · font var swapped back to General Sans ·
`variant="light"` removed from pricing · `server-only` removed · a `.ts` dropped under `public/`.
The two behaviours vitest structurally cannot assert (`server-only` is stubbed; `next/font/google`
only exists inside Next's compiler) say so in their own headers and point at the build-time proof
— honest, not a hallucinated safety net.

## Rebase integrity

s09 fully intact: `scripts/init.mjs` (51 tests green), the `init` script, `backup-prod.sh` still
deleted, s09's `globals.css` and `cookie-banner.tsx` rewordings preserved. `app/globals.css` carries
only s10's hunks — no duplicated or contradictory edit. The hand-resolved favicon conflict landed
correctly: s09's comment strip is superseded by s10's redraw, s09's intent preserved.

## Findings — all minor, all closed before ship

| #   | Finding                                                                                                                                                                                                                                                                     | Resolution                                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Print reset forces `background`/`color` on `html, body` only. Browsers drop descendant `background-color` when "Background graphics" is off, so `bg-pine` headers print white while `text-paper` children stay white — chrome invisible on `/`, `/cgv`, `/login`, `/signup` | `.print-hide` utility applied to headers, legal nav, auth chrome and both sidebars: chrome is hidden in print rather than repainted |
| 2   | `logo.tsx:22` `wordmarkAccent` is a tautological ternary (`text-lime` in both branches) — the light register was never designed. s10 is the first story to render it, at **2.84:1** vs WCAG AA's 4.5:1                                                                      | light register switched to `text-link` — **5.98:1**, passes AA. No token added, no value changed                                    |
| 3   | `app/globals.css:10` and `docs/theming.md` still named General Sans after it was replaced — in the file the story declares the source of truth                                                                                                                              | both corrected                                                                                                                      |
| 4   | `docs/design-system.md` § _Hors périmètre_ forbade recreating things that were still in `@theme`: `--font-serif`/`--font-read`, `cat-tools*`/`cat-people*`, the `ob-*` keyframes                                                                                            | dead CSS deleted (doc was right, code was wrong); `cat-sector*` kept — `badge.tsx` consumes it                                      |
| 5   | The plan's "Files touched" listed binaries that never shipped and omitted two real files; T6's human decision lived only in a commit message                                                                                                                                | plan reconciled with `git diff --stat`; the Plus Jakarta Sans / FFL decision recorded                                               |
| 6   | `gitignore.test.ts` justified `backups/` by a script s09 deleted                                                                                                                                                                                                            | rule and test both dropped — nothing writes there                                                                                   |

**Licence residue in branch history**: the first commit added three FFL-restricted `GeneralSans-*.woff2`
blobs, later removed. Since the files were dropped _for a licence reason_, leaving them fetchable from
`refs/pull/N/head` — which GitHub keeps permanently — would undo that decision. The branch was squashed
to a single commit and force-pushed **before** the PR was opened, so no pull ref ever captured them.
This also satisfies AGENTS.md's one-commit-per-story rule.

**Deliberately deferred, not forgotten**: `pine` and `lime` are now misnomers for a slate/indigo
palette. Renaming touches ~200 call sites plus `theming.md`, `design-system.md`,
`check-design-tokens.mjs` and the favicon, and would have broken this plan's "aucun re-theming"
interdict. It deserves its own story, which should also own `docs/theming.md`'s "Re-theming in 1 step"
promise — already slightly false, since `public/favicon.svg` hardcodes the palette.

**Known nit, left**: `app/globals.css:44` still says "Skill categories" — CV-domain vocabulary in a
comment that otherwise legitimately explains why only `cat-sector` survives.

## Not verified — needs a human at recette

- **Print rendering.** The CSS is proven; no print preview was rendered. Open `/fr/cgv` and
  `/fr/mentions-legales` → Cmd+P with "Background graphics" **off** (default) _and_ **on**. Confirm
  body text is dark on light in both, and that hiding the chrome reads as intended. Repeat on `/`,
  `/login`, `/signup`.
- **Actual font rendering.** Vitest runs in `environment: node`: the woff2 ship, the preloads emit
  and the CSS variables resolve on `<html>`, but no glyph was painted. Open `/fr`, DevTools →
  Rendered Fonts on an `<h1>`: expect _Plus Jakarta Sans_, not the fallback. Check `font-mono`
  (`SectionLabel`) and `font-ui` (body) too.
- **Wordmark contrast in the eye.** 5.98:1 is computed, not seen. Look at `/fr/pricing`, and toggle
  dark mode on `/dashboard` to sanity-check the sidebar logo.
- **Favicon in the wild.** SVG bytes and a 200 were verified, not how a 220×220 diamond reads at 16×16.
  Open a real tab; add to home screen on iOS.
- **`npm run init` end-to-end.** s09's 51 tests pass and `shouldInclude` is default-allow, but no
  project was actually scaffolded. Confirm `app/fonts/`, the root test files and the new favicon land
  in a fork and that `npm run build` passes there.
- **Anything touching Supabase or Stripe.** The `server-only` guard was proven at build time, never
  at runtime against a live service-role key.

## Verdict

Seven acceptance criteria met, six plan tasks done, five gates green under the reviewer's own hands.
No invented API, no plausible-but-wrong value, no assertion-free test, no ADR contradicted — and one
previously violated ADR (004) now satisfied. The six minor findings were all closed before ship.

Max severity: minor
Ship allowed: yes
