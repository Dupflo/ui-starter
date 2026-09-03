# Review — Story s18-ui-kit-polish

> Fresh-context reviewer subagent. Diff judged: `git diff origin/main...feature/s18-ui-kit-polish`.
> Source: three visual annotations drawn on the running app. Everything was driven through headless
> Chrome and CDP; every test in the diff was neutralized.

## Gates — reproduced by the reviewer

`test` **491/77** (matches the commit exactly) · `test:build` 1/1 · `lint:design` green, 168 files ·
`typecheck` clean · `build` clean · `lint` 5 warnings (4 pre-existing + 1 new, since suppressed).
Code blocks by DOM query: **27**. `/fr/ui` 404 on a normal build, 200 under `DEMO_MODE=1`.
No dependency added, **no file added to `public/`**. After the fix commit: 490 tests, 4 warnings.

## Sign-off on the token-guard allowlist entry — granted

The diff touches `scripts/check-design-tokens.mjs`, whose own header requires a review sign-off for a
new allowlist entry. Verified:

- **The change is comment-only.** Everything from the `import` onward is byte-identical to `main`.
  No new rule, no path-glob. Four sentinels, on the exact lines.
- **The isolation claim is true, and was tested rather than read.** A page setting
  `:root{--probe-color:#ff0000}` embedding `<img src="data:image/svg+xml,…fill="var(--probe-color,
#000000)"…">` samples to **rgb(0,0,0)** — the fallback. The same markup as an inline `<svg>`
  resolves to **rgb(255,0,0)**. So a data-URI SVG in an `<img>` genuinely cannot reach the page's
  custom properties, and literal hex is the only option **given the `src`-URL shape the AC mandates**
  (the AC asks for avatars _with images_; an inline `<svg>` would never exercise the `src` path).
- **The cross-check bites on subtle mutations**: a one-digit drift (`#1e2132` → `#1e2133`), a drift in
  the _other_ direction (editing `globals.css` instead), and a near-identical off-white — each red.

Two caveats recorded, neither blocking: only light-mode `@theme` values are cross-checked (documented),
and `themeHex()` takes the _first_ `--color-<name>` match, which is the `@theme` value only because
`@theme` precedes `.dark` in the file today.

## Findings

### major — the sortable guards matched the copyable snippet string, not the live config

`data-table-demo-columns.test.ts` pinned the "sort across types" criterion with
`toMatch(/key:\s*"signups"[\s\S]{0,80}sortable:\s*true/)` against the **whole** DataTable block —
which contains both the display-only `code:` template string **and** the real `value:` array. Deleting
`sortable: true` from all three real columns left **5/5 green**: the `code:` string alone satisfied
every regex.

What that let through is the gallery's own core invariant — **copyable code advertising
`sortable: true` over a table that no longer sorts.** A test matching the code _display_ rather than
the code is exactly backwards.

**The eighth weak guard in this project**, and the file already defined `realColumnKeys()` for
precisely this reason; the count assertion used it, the three sortable assertions did not. Now scoped
to the individual real column object. Re-probed by the coordinator against the correct lines: **3 tests
fail**, green on restore.

_(Nothing shipped broken — the reviewer drove the built page and confirmed all six columns behave,
`signups` sorting numerically 9 → 47 → 182 → 310 rather than lexically, `joinedDate` chronologically.
The defect was the guard alone.)_

### minor — closed in the same pass

- **The `<img>` justification cited a precedent that argues the opposite.** `avatar.tsx` claimed to
  follow `app-sidebar.tsx`, which renders its photo as a **background-image span** — the technique
  `avatar.test.ts` explicitly asserts against, and the one that emits no lint warning. Rewritten to the
  real reason: `alt=""` is what makes decorative avatars produce **no AX node at all**, which a
  background-image span cannot express.
- **A new lint warning shipped unsuppressed**, drifting the "0 errors, 4 warnings" baseline every
  review this session has checked. Inline `eslint-disable-next-line` with a justification added,
  following the repo's own precedent in `snippet.ts`.
- **The Avatar demo paired an "AM" image with the name "Camille Girard"** — three `role=image` AX nodes
  named "Camille Girard" over discs reading AM, in a UI Kit whose job is to teach the primitive. Now
  uses the matching fixture.
- **The horizontal-scroll rationale was factually wrong** in both the test header and
  `docs/design-system.md`: with the new columns removed the table still overflowed at mobile (373px vs
  290px), and at ≥768px neither version scrolls. The added columns widen the overflow; they did not
  make the scroll demonstrable. Corrected. The multi-type-sort half of the AC is genuinely delivered.
- The fixtures doc comment miscounted its own fixtures; the pine demo avatar's disc vanished in dark
  mode (`#1e2132` on `#1a1d2e`) and moved to a token that reads in both themes; a stray blank line
  broke the JSDoc continuation.

### the `keyof Row` boundary — closed, not merely recorded

In `data-table-users-demo.tsx` a bad key already failed to compile, but the primitives-section demo's
`columns` travelled through `Snippet["props"]` (`Readonly<Record<string, SnippetPropValue>>`), which
**erases the generic** — `key: "joinedDateTypo"` passed `tsc` cleanly. Pre-existing from s17 and the
same shape as the `defaultSort` major its review caught, but plan T5 was ticked as though the guarantee
held.

Closed with `satisfies Column<DataTableDemoRow>[]` at the literal's own call site — no relocation, so
the source-level guards still read the same text. Verified by the coordinator: a bogus key now yields
`TS2820`.

## A note on probing

The coordinator's first two verification probes **both hit the wrong target** — one mutated the
pagination labels object, the other the `code:` display string — and reported false green. That is the
same confusion the major is about: this block holds the displayed code and the live config side by
side, and a naive match finds the wrong one. Worth recording, because it shows the trap catches
reviewers too, not only test authors.

## Not verified — needs a human at recette

- **The UI Kit by eye**, light and dark: the renamed nav entry, the avatars (image and initials
  fallback), and the six-column table.
- **Whether removing the `pad` demo was the right call** — the information moved to the props table
  rather than being lost, but you asked "je vois pas l'intérêt" and only you can confirm the answer.
- **The table at desktop widths**: the horizontal scroll only engages at mobile, so on a wide gallery
  the demo never scrolls.

## Verdict

The allowlist entry earned its sign-off on evidence, the Avatar work survived six mutations, and the
accessible-name behaviour is exactly the two states the AC demanded — informational avatars named,
decorative ones producing no AX node at all. What the review caught was the eighth guard in this
project that matched something adjacent to what it claimed to check, plus a justification comment that
cited a precedent arguing against its own decision.

Max severity: minor
Ship allowed: yes
