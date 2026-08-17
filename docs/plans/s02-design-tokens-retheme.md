---
validated: yes
---

# Plan — Story s02-design-tokens-retheme

Branch: `feature/s02-design-tokens-retheme`
Research: `docs/research/s02-design-tokens-retheme.md` — read it first; this plan does not repeat it.

## Target story

**As a** builder, **I want** to change the whole app palette by editing a single tokens file, **so that** each forked SaaS gets its visual identity in seconds. Complexity 3.

Acceptance criteria:

1. A single `@theme` token file defines the palette. (Already true — `app/globals.css:12-73`.)
2. Editing palette values updates every current component/screen without touching their code; later screens (s04, s07) inherit and are re-checked on arrival.
3. `npm run lint:design` (`check-design-tokens`) passes **and fails if a raw colour (hex/rgb) is used outside tokens**. (The guard's real extension — the point of the story.)
4. A short doc (`docs/` or README) explains how to re-theme in 1 step.

Two of four criteria are near-done (AC1 fully, AC2 mostly). The work is: extend the guard (AC3), close the `bg-white` re-theme leaks (AC2), write the doc (AC4), and — pending validation — neutralise the brand palette (the PRD headline).

## Tasks (ordered)

Ordered so the guard is extended and made green _before_ the surface fixes rely on it, and the "guard bites" proof lands right after the guard change.

1. [x] **Extend `scripts/check-design-tokens.mjs` with three raw-colour rules, added to the existing `RULES` array — do not touch the five arbitrary-value rules.** New rules, each a `{category, re, hint}` entry matching outside Tailwind bracket syntax:
   - `raw-hex` — a `#rgb`/`#rrggbb`/`#rrggbbaa` literal not already inside a `-[…]` arbitrary value (those are caught by the existing `colour` rule). Matches inline `style={{ background: "#10301E" }}` and SVG `fill="#4285F4"`.
   - `raw-colour-fn` — `rgb(` / `rgba(` / `hsl(` / `hsla(` / `oklch(` / `oklab(` / `lab(` / `lch(` / `color(` literals in a string/style context (again, not the bracket form).
   - `bare-palette-utility` — bare Tailwind built-in colour utilities that bypass tokens: `bg-white`, `bg-black`, `text-white`, `text-black`, and the numbered default palettes (`(?:bg|text|border|ring|fill|stroke|from|via|to|divide|outline|placeholder|caret|accent|decoration)-(?:white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3})`. Note: token utilities like `bg-lime`/`fill-pine` have NO numeric suffix and are `@theme` names, so they must NOT match — the rule requires either the bare word (`white`/`black`) or a `-<number>` suffix.
     Keep the file-walk (`ROOTS`, `EXT`, `walk`), the violation loop, and the success/exit paths unchanged; only append to `RULES` and (see task 3) apply the allowlist filter. Update the success message count expectation is automatic (`files.length`).

2. [x] **Add an auditable inline allowlist for the two legitimate raw-colour sites, documented in the script header.** Mechanism: a per-line sentinel comment `/* design-tokens-allow: <reason> */` — when the guard finds a match on a line (or its line-above) carrying that sentinel, it skips it and records the skip. Implement as a filter in the violation loop (check the current line and the immediately preceding line for the sentinel token). Document the sentinel + the exhaustive list of allowed sites in the script's top comment so the reviewer can audit it:
   - `app/global-error.tsx` inline hex (`#10301E`, `#F5F5F0`, `#C5F24D`) — root error boundary renders without the app CSS bundle, so it cannot use token utilities.
   - `components/auth/google-button.tsx` SVG `fill="#4285F4"|#34A853|#FBBC05|#EA4335"` — Google's fixed brand colours, not themeable.
     Add the sentinel comment to exactly those lines. The allowlist must stay narrow: no path-glob wildcards, one sentinel per real line.

3. [x] **Prove the guard bites (AC3, the story's whole point).** Temporarily plant a raw colour that the OLD guard missed — e.g. add `style={{ color: "#ff0000" }}` to a throwaway spot, or a `bg-blue-500` class — run `npm run lint:design`, confirm it exits non-zero and names the file/line/category, then remove the plant and confirm exit 0 at the (now unchanged) file count. Record the two outcomes in the story commit message or a one-line note; the reviewer re-runs this. This task's deliverable is the evidence, not a code change.

4. [x] **Close the `bg-white` re-theme leaks → `bg-input`.** Replace `bg-white` with `bg-input` at `components/ui/modal.tsx:87`, `components/auth/auth-shell.tsx:18`, `components/auth/google-button.tsx:48`. `--color-input: #ffffff` is the existing token (`globals.css:29`) and is re-pinned in `.dark` (`:93`) and `.light-scope` (`:125`), so these surfaces now follow the theme. Verify each surface still renders white in light mode (token value is `#ffffff`) — this is a token-name swap, not a visual change today. After this, the `bare-palette-utility` rule from task 1 finds zero `bg-white` in the tree → the guard and the fix are mutually confirming.

5. [x] **Write the 1-step re-theme doc → `docs/theming.md`.** Required content, kept short: (a) the single edit point — the `@theme` block in `app/globals.css` (base), and that `.dark` + `.light-scope` must be kept in sync (three registers); (b) which token groups map to what (brand `pine`/`lime`, surfaces, semantics, fonts); (c) the verification step — `npm run lint:design` (also runs at `prebuild`) fails the build if a raw colour slips in; (d) the two allowlisted exceptions and why. No new README at repo root (none exists; `docs/` is the AC-accepted home).

6. [x] **[VALIDATOR DECISION — brand neutralisation] Neutralise the Applyzi brand palette to a neutral placeholder identity.** RECOMMENDED, but flagged as the main scope choice for the human validator (see "The point everything turns on"). If approved: edit token VALUES ONLY in the `@theme` block, `.dark`, `.light-scope`, and the `.dark .bg-pine`/`.bg-pine-900` re-pin (`globals.css:103-106`) — no token renames, no component changes. Re-point `--color-pine`/`--color-pine-900`/`--color-lime` (and the on-pine foregrounds) to a neutral slate/indigo placeholder; leave the surface/semantic neutrals as-is. Keep all three registers consistent. Do NOT touch the dead CV tokens (`--color-cat-*`, `--font-serif`, `--font-read`, CV print block) — removing them is a separate cleanup, out of scope, and the research warns they may still be referenced (grep first, next story). If the validator declines, skip this task: the starter ships with the pine/lime look and the story still delivers the mechanism + guard + doc.

7. [x] **Full verification.** `npm run lint:design` green at the (unchanged) file count; `npx tsc --noEmit` clean; `npm run build` succeeds (proves `prebuild` still gates and passes). If task 6 ran, spot-check that a pine surface and a lime accent reflect the new values and that dark mode is consistent.

## Run interdicts

- Do NOT weaken, rewrite, or reorder the five existing arbitrary-value rules in `RULES` — extend by appending only. The `colour`/`border-radius`/`font-size`/`letter-spacing`/`box-shadow` regexes must diff clean.
- Do NOT remove the guard from `prebuild` or `lint:design` (`package.json:10,15`); the build must stay gated (ADR 002).
- Do NOT introduce any new raw colour anywhere (hex, `rgb()/hsl()/oklch()`, bare `white`/`black`, numbered palette) outside the two allowlisted, sentinel-marked sites.
- Do NOT rename any `@theme` token or add a `tailwind.config` (Tailwind v4 CSS-first, ADR 002). Task 6, if run, changes VALUES only.
- Do NOT delete the dead CV tokens (`--color-cat-*`, serif/read fonts, CV print CSS) — out of scope; grep-before-delete is a later story.
- Do NOT widen the allowlist beyond the two documented sites; no path wildcards, no blanket file skips.

## The point everything turns on

**The guard extension must catch raw colours without false-positiving the two legitimate sites, and it must NOT match the `@theme` token utilities** (`bg-lime`, `fill-pine`, `text-ink-strong`). Three places this can be wrong, and what to check each against:

- **The `bare-palette-utility` regex** could swallow token utilities. Check: token utilities have no numeric suffix and are `@theme` names; the regex must fire only on bare `white`/`black` or a `-<number>` suffix. Compare against the 70-file tree — it must stay green after task 1 except for the three `bg-white` (fixed in task 4).
- **The allowlist scope.** Check: the sentinel matches exactly the lines in `global-error.tsx` and `google-button.tsx` named in task 2, nothing else. An over-broad allowlist silently reopens the drift the story closes — audit the script header's exhaustive list against the diff.
- **`globals.css` is out of the walk** (`.tsx?/.jsx?` only), so the `rgba(...)` in `--shadow-*` and the hex token values are not scanned — correct, tokens are the source of truth. Confirm no rule accidentally starts reading `.css`.

Separately flagged for the validator: **task 6 (brand neutralisation) is the most reversible-but-visible call.** It is the PRD's headline ("change one palette, all UI follows") made literal, and s02 is where the placeholder identity would live. It touches only token values across three registers (trivially reverted), but it visibly changes the starter's look. Approve to ship a neutral starter; decline to keep pine/lime and deliver only the mechanism. Everything else in the plan is independent of this choice.

## Files touched

- `scripts/check-design-tokens.mjs` — append 3 rules + sentinel allowlist filter + header doc (tasks 1, 2).
- `components/ui/modal.tsx`, `components/auth/auth-shell.tsx`, `components/auth/google-button.tsx` — `bg-white` → `bg-input`; sentinel comment on the Google SVG fills (tasks 2, 4).
- `app/global-error.tsx` — sentinel comment on the inline-hex `style` block (task 2).
- `docs/theming.md` — new, the 1-step re-theme doc (task 5).
- `app/globals.css` — token VALUES only, `@theme` + `.dark` + `.light-scope` + `.dark .bg-pine` (task 6, only if validator approves).

## Test strategy

- **Guard, behavioural (AC3):** manual bite test (task 3) — plant a raw colour the old guard missed, assert `lint:design` exits non-zero and names it, remove, assert exit 0. This is the acceptance evidence; there is no Vitest harness for `.mjs` scripts today and adding one is out of scope. If a lightweight check is wanted, a single Vitest `*.test.ts` that spawns the script against a temp fixture dir is acceptable but not required — the manual proof plus the reviewer re-run cover the criterion.
- **Guard, regression:** `npm run lint:design` green at the unchanged file count after all changes (no false positives on token utilities or allowlisted sites).
- **Surfaces (AC2):** the `bg-white`→`bg-input` swap is a token-name change with identical light-mode value; visual parity in light, correct following in dark/light-scope. Confirmed by the guard finding zero bare `bg-white` post-fix.
- **Build gate:** `npm run build` succeeds → `prebuild` guard still passes and gates. `npx tsc --noEmit` clean.
- **Re-theme, if task 6 runs:** edit token values, `lint:design` stays green (values, not arbitrary utilities), and a pine surface + lime accent + dark mode reflect the change without any component edit — the AC2 guarantee, demonstrated.

## Definition of Done

- Single PR on `feature/s02-design-tokens-retheme`, readable diff carrying research + this plan + review.
- `npm run lint:design` passes AND provably fails on a raw colour outside tokens (AC3) — the five original rules untouched.
- The three `bg-white` surfaces follow the theme via `bg-input` (AC2); no new raw colours outside the two auditable allowlisted sites.
- `docs/theming.md` states the 1-step re-theme (AC4).
- Brand-neutralisation decision recorded (done per task 6, or explicitly deferred by the validator).
- `npm run build` green (guard still gates via `prebuild`), `npx tsc --noEmit` clean, no regression.
- Review passed (no open critical issue).
