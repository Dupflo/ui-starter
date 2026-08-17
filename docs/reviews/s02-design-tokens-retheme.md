# Review — Story s02-design-tokens-retheme

Branch `feature/s02-design-tokens-retheme` @ `4b7f818`. Diff vs `main`. Reviewer: fresh-context anti-hallucination pass.

## Gate (run on Node 22.17 via nvm)

| Command               | Result                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`   | exit 0 — clean                                                                                                       |
| `npm run lint`        | exit 0 — 0 errors, 4 warnings (pre-existing `react-hooks/set-state-in-effect` in modal.tsx, untouched by this story) |
| `npm run lint:design` | exit 0 — `70 files (… raw-hex, raw-colour-fn, bare-palette-utility). (8 allowlisted matches skipped)`                |
| `npm run test`        | exit 0 — 5 files, 16 tests pass                                                                                      |
| `npm run build`       | exit 0 — `prebuild` guard runs and gates, compiled successfully, 27/27 static pages                                  |

## Plan compliance

7 tasks, all landed and verified against the diff:

- **T1 (extend guard, 3 rules, appends only)** — done. The five original rules diff byte-clean (verified against `git show main:`); only three `{category,re,hint}` entries appended (`raw-hex`, `raw-colour-fn`, `bare-palette-utility`). File-walk, violation loop, exit paths preserved.
- **T2 (inline allowlist, 2 sites, documented)** — done. Per-line sentinel `/* design-tokens-allow: <reason> */` with 2-line lookback; exhaustive list in the script header; sentinels on exactly `app/global-error.tsx` (inline hex) and `components/auth/google-button.tsx` (SVG fills). No wildcards, no file-level skip logic.
- **T3 (prove the guard bites)** — re-verified independently (see Anti-hallucination). Bites on planted `#ff0000`, `bg-blue-500`, `rgb()`, SVG `fill="#…"`, `bg-white`; all name file/line/category and exit 1.
- **T4 (bg-white → bg-input ×3)** — done at modal.tsx, auth-shell.tsx, google-button.tsx. `grep bg-white` in app/components/lib → NONE.
- **T5 (docs/theming.md)** — done. Single edit point, three registers, `lint:design` + prebuild verification, two exceptions all present.
- **T6 (brand neutralisation, values-only)** — done. `app/globals.css` diff is values-only across `@theme`/`.dark`/`.light-scope`; pine/lime/on-pine re-pointed to slate/indigo placeholders; no token renames, no component edits, no tailwind.config, dead CV tokens (`--color-cat-*`, serif/read fonts — 9 refs) preserved.
- **T7 (full verification)** — reproduced above.

Diff scope matches the plan's "Files touched" set exactly — no drift in either direction.

## Anti-hallucination (verified by running)

Guard behaviour re-run with fixtures I planted (not trusting the commit note):

- Positive: `style={{color:"#ff0000"}}` → `[raw-hex]`; `bg-blue-500` / `bg-white` → `[bare-palette-utility]`; `rgb(...)` → `[raw-colour-fn]`; SVG `fill="#4285F4"` → `[raw-hex]`. All exit 1 with `file:line [category] match`.
- No false positive: `bg-lime fill-pine bg-input text-ink-strong bg-paper text-lime border-pine-900 stroke-pine` → exit 0. Token utilities (no numeric suffix) correctly pass.
- Sentinel scope: same-line and 1-line-above sentinel exempt the match; a raw colour 3 lines below a sentinel (non-adjacent) is STILL caught. Exemption is per-line, not per-file.
- `--color-input` confirmed pinned in all three registers: base `#ffffff` (l.31), `.dark` `#161929` (l.95), `.light-scope` `#ffffff` (l.127). The three `bg-input` surfaces now re-theme.

No invented APIs: script uses only `node:fs`/`node:path`; no new imports, no new npm dep (`package.json` unchanged).

## Rules compliance (AGENTS.md + ADR 002)

- ADR 002 upheld: single `@theme` source, no `tailwind.config`, guard stays in `prebuild` + `lint:design`, brand tokens replaced by neutral placeholders (ADR consequence l.20 explicitly asks for this). No contradiction.
- Five original arbitrary-value rules untouched (interdict respected). Guard not removed from prebuild. No new raw colour outside the two sentinel sites. No token renamed. Dead CV tokens not deleted. Allowlist not widened.
- Tailwind v4 CSS-first, `@/` conventions, colocated tests — all respected.

## Tests

No Vitest harness for the `.mjs` guard (out of scope per plan; manual bite test is the accepted AC3 evidence, and I reproduced it). Existing 16 tests pass; the `bg-white`→`bg-input` swap is a token-name change with identical light-mode value (`#ffffff`), so no test needed to change.

## Regressions

- Touched surfaces (modal, auth-shell, google-button) keep identical light-mode rendering (`--color-input` = `#ffffff`) and now follow dark/light-scope. No behavioural change.
- `.dark .bg-pine` re-pin (globals.css:107) still holds `--color-paper: #f9faf9` while base paper moved to `#f9f9fb` — see Findings. Cosmetically inert (near-identical off-white), no brand colour leaked.
- Build, typecheck, lint, tests all green post-change.

## Findings

- **[minor] Stale off-white in the `.dark .bg-pine` re-pin.** `app/globals.css:107` still uses the pre-neutralisation base paper value `#f9faf9`; base (l.22) and light-scope (l.117) were updated to `#f9f9fb`. Task 6 listed this block in scope. The two values are visually indistinguishable (~98% lightness, no hue), it is a neutral not a brand colour, and dark-mode legibility on pine surfaces is unaffected — so it does not break the re-theme promise. Recommend syncing to `#f9f9fb` next cycle for consistency.
- **[minor] Doc colour list.** `docs/theming.md:51` lists three global-error hexes; the file also reuses `#10301E` for button text. The distinct-colour list is accurate; note only.

## Not verified

- Visual rendering of the neutral palette in a running browser (dark/light-scope) — inspected token values and the re-pin logic statically; no runtime screenshot taken.

## Verdict

The crux (AC3 guard extension) is real and correct: it catches raw hex, colour functions and bare/numbered palette utilities in className, inline style and SVG fill/stroke, without false-positiving `@theme` token utilities; the allowlist is narrow, per-line and auditable. AC1/AC2/AC4 all met. Values-only neutralisation respects every interdict and ADR 002. Only two cosmetic minors, both inert.

Max severity: minor
Ship allowed: yes
