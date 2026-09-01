# Review — Story s14-dataviz-and-combobox

> Fresh-context reviewer subagent. Diff judged: `git diff origin/main...feature/s14-dataviz-and-combobox`.
> This story adds a **runtime dependency** (Recharts 3, pulling Redux Toolkit, react-redux, immer,
> reselect, victory-vendor) and two primitives to a starter every future project forks — reviewed
> accordingly. Measurements were re-taken independently by building `origin/main` in a throwaway
> worktree; browser behaviour was driven through headless Chrome and CDP, not reasoned about.

## Gates — reproduced by the reviewer after `rm -rf .next`

`test` **374/58** (matches the commit's claim exactly) · `test:build` 1/1 · `lint:design` green, 145
files · `typecheck` clean · `build` success · `lint` 4 pre-existing warnings, 0 new.
After the fix commit: **380 tests, 59 files**.

## The dependency decision, discharged honestly

| Measurement                             | Claimed    | Reviewer's independent value                               |
| --------------------------------------- | ---------- | ---------------------------------------------------------- |
| `/[locale]/ui` uncompressed             | +433,624 B | **+433,651 B** (27 B build variance)                       |
| gzip over the route's first-load chunks | +123,240 B | **+123,223 B**                                             |
| Recharts chunk                          | —          | 455,132 B, emitted                                         |
| User-facing pages referencing it        | —          | **zero** — `/`, `/pricing`, `/login`, `/signup` all grep 0 |

So the cost is **deploy-artifact size, not user-facing weight**: Next's route-level splitting isolates
Recharts and Redux to `/ui`, which 404s at runtime via `notFound()` — the route still compiles and
ships, but no visitor ever downloads it.

**Encapsulation is real and guarded.** Injecting `from "recharts"` into `primitives-section.tsx` turns
the guard red; removing it, green. No Recharts prop pass-through leaks through the wrappers.

**Token discipline holds on hydrated markup**, not just in source. Headless Chrome `--dump-dom`, 8
`recharts-surface` elements: the complete set of `fill`/`stroke` values is `none`,
`var(--color-input)`, `var(--color-lime)`, `var(--color-line)`, `var(--color-link)`,
`var(--color-muted)`, `var(--color-success)`. **Zero hex literals**, legend icons included. (Recharts'
real defaults are `#3182bd` for Line and `#808080` for Pie — `#8884d8` is only a doc example, but the
trap is real and genuinely avoided.)

**Dark mode verified, then re-verified.** Driven via CDP with a real click on the "Mode sombre" toggle:
the grid stroke's _computed_ colour goes `rgb(226,226,232)` → `rgb(42,45,64)` while the attribute stays
the literal `var(--color-line)`. Pure CSS re-resolution, zero component-side JS — so it follows any
future re-theme too. The series colour is unchanged because `--color-lime` is deliberately not
overridden in `.dark`: correct, not a failure.

**The keyboard implementation is better than the plan claimed.** The plan listed real key interaction as
unverifiable here (no jsdom/happy-dom in this repo). The reviewer dispatched actual key events through
CDP: arrow navigation with wrap-around, Home/End, Enter selecting and closing, Escape closing,
`aria-activedescendant` resolving to an existing option id at every step, and `document.activeElement`
staying the input throughout. Not a mouse-only combobox.

## Findings

### major — the Combobox had no accessible name

`components/ui/combobox.tsx` copied `Select`'s markup but dropped the `<label className="block">`
wrapper, leaving the visible label a bare `<span>`: no `htmlFor`, no `aria-labelledby`, no `aria-label`
on the input. The `aria-label={label}` that was written landed on the `<ul role="listbox">` — **the name
was on the popup instead of the control.**

Confirmed via `Accessibility.getPartialAXTree` on the hydrated DOM: the input's name was
`"Rechercher un pays…"` with `"type":"placeholder"`, every real labelling source empty — the only
control in the repo naming itself from its placeholder. Since `placeholder` is optional,
`<Combobox label="Pays" options={…} />` shipped a control with **no accessible name at all**. Fails
WCAG 4.1.2, contradicts the story's AC and `design-system.md`'s own "Accessibilité livrée" list, which
enumerated every ARIA attribute except the one that matters most.

**Fixed**: real `<label htmlFor={inputId}>`; AX tree now reports name `"Pays"` from
`nativeSource:"labelfor"` with the placeholder marked `superseded`. Verified before/after on a real
`DEMO_MODE=1` artifact, and pinned by 4 regression tests proven red against the original code.

### minor — the encapsulation guard missed three realistic evasions

`/from\s+["']recharts["']/` caught the quoted forms but passed on `from "recharts/es6/chart/LineChart"`
(a normal tree-shaking idiom), `require("recharts")`, and `await import("recharts")` (`next/dynamic` is
idiomatic for chart libraries). `ROOTS` also omitted `lib`. **This guard is what ADR 006's reversibility
rests on** — and it would have been the fifth guard in this project whose pattern did not match its own
title. Widened and re-probed by the coordinator: all four evasive forms now go red individually.

### minor — `isAnimationActive={false}` was masking a transient nobody could reproduce

The reviewer removed it, rebuilt and probed: the mid-draw frame is real at ~400 ms (line at
`stroke-dasharray: 85.65px 259.49px`, two empty layer groups) but everything settles by 1.2 s with `d`
byte-identical to the disabled build. **No permanent freeze reproducible.** Meanwhile Recharts 3's
default `'auto'` already honours `prefers-reduced-motion`, so hardcoding `false` removed motion for
everyone with no opt-out through the narrow API. **Dropped**, and the comments now describe the real
transient instead of a freeze.

### minor — others, all closed

The empty-state popup was an invalid listbox (`role="listbox"` on a `<div>` whose only child was a text
node, and it dropped the `aria-label` the populated branch carried) — now a valid
`role="option" aria-disabled aria-selected={false}` item in the same `<ul>`. A test header referenced a
"second describe block" that does not exist. `chart-bar.tsx` reused `ChartLineSeries` for bar series —
now its own exported type. `design-system.md` described a `slices` prop that does not exist.

### minor — a measurement of the coordinator's was wrong

"+66 B on other routes" was off by roughly 2×; measured against a fresh `origin/main` build it is
**+28 B / +30 B**. Conservative direction, and the material claim (Recharts isolated to `/ui`) holds.
Corrected in the story and the plan.

## Not verified — needs a human at recette

- **The charts and combobox in a real browser, by eye.** Everything was driven headless. Look at the
  three charts in `/ui` in light and dark, resize the window (the `ResponsiveContainer` transient is
  real, even if it settles), and drive the combobox by keyboard yourself.
- **`prefers-reduced-motion`.** Now that the animation hardcode is gone, Recharts' `'auto'` should
  suppress the entrance animation when the OS setting is on. Toggle it and confirm.
- **Mobile widths** for the charts and the combobox popup.
- **Whether charts belong in real screens at all.** They are currently used only by the gallery, which
  is dev/demo-only. If no forked screen ever renders one, the dependency is carried for nothing — worth
  revisiting once a real dashboard need appears.

## Verdict

The dependency decision is discharged honestly: measurements reproduce to within build noise,
encapsulation is real and now guarded against realistic evasions, token discipline holds on hydrated
markup, and dark mode was verified by driving a browser rather than asserted. The one real defect — a
control with no accessible name, contradicting a documented claim — was scoped, one line, and is fixed
and pinned.

Max severity: minor
Ship allowed: yes
