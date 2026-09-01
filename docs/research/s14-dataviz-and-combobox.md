# Research — Story s14-dataviz-and-combobox

Base: `main` @ `f53ce0e` · ADR: `docs/decisions/006-charting-library.md`

## Correction to ADR 006's dependency picture — measured, not estimated

ADR 006 named the cost as "Recharts + d3-scale/shape/array". That list is **incomplete**, measured
with `npm view` before installing anything:

|                     | recharts 3.10.1                                                                                                                                                                  | recharts 2.15.4                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `dist.unpackedSize` | **7 452 998 B** (7.45 MB)                                                                                                                                                        | 4 650 058 B                                                     |
| runtime deps        | `@reduxjs/toolkit`, `react-redux`, `immer`, `reselect`, `es-toolkit`, `victory-vendor`, `decimal.js-light`, `eventemitter3`, `tiny-invariant`, `use-sync-external-store`, `clsx` | `lodash`, `react-smooth`, `recharts-scale`, `victory-vendor`, … |
| React 19 peer       | yes                                                                                                                                                                              | yes                                                             |

**Recharts 3 rebuilt its internal state on Redux.** Installing it puts `@reduxjs/toolkit` and
`react-redux` into the dependency graph of a starter that has no state-management library, and into
every SaaS forked from it. That is a qualitative surprise, not just a size one.

Human decision (01/09/2026), taken with these figures in hand: **proceed with Recharts 3**. Redux stays
internal to Recharts; no screen imports it. The ADR's encapsulation rule is what keeps that true.

The ADR is immutable once accepted (AGENTS.md), so this correction lives here rather than as an edit
to it. The ADR's own requirement — _"le poids ajouté au bundle doit être mesuré et inscrit dans la
story"_ — is discharged by this section plus the post-install measurement the plan requires.

`dist.unpackedSize` is **not** bundle size: it counts every file in the published tarball, ESM and CJS
builds and sources included. The number that matters is the delta on the emitted client bundle, and it
can only be measured after installing and rendering a real chart. Do not quote 7.45 MB as a bundle
cost.

## The trap the ADR got wrong, and s13 corrected

ADR 006 originally claimed a raw hex would "break the build" via `check-design-tokens`. It would not:
`scripts/check-design-tokens.mjs` walks only `app`, `components`, `lib` and skips `node_modules`.

**Recharts ships default series colours** (`#8884d8`, `#82ca9d`…) applied whenever no `fill`/`stroke`
is passed. An uncoloured chart therefore renders off-palette **with a fully green build**, and those
defaults, being internal to the library, will not follow the `.dark` re-theme either. Every series must
receive its colour explicitly, and it must be verified on the render, not on the lint.

## Dark mode — the specific hazard

`app/globals.css` overrides token values inside `.dark`, and the app shell puts `.dark` on an ancestor
div (not on `<html>` — s10's review established this). A chart that reads a colour **once at mount**
(e.g. `getComputedStyle`) will not follow a theme switch. Passing `var(--color-…)` straight into
Recharts' `fill`/`stroke` lets the browser resolve it per paint, which does follow. Verify by switching
theme with a chart on screen, not by reasoning.

## Client boundary

Recharts renders client-side only. The chart wrappers are `"use client"`. Note the s13 finding: **every
export of a `"use client"` module becomes an opaque client reference when read from server code** —
reading `Object.keys(sizes)` from a Server Component silently returned `[]`. So if the chart modules
export any table the gallery must enumerate, that enumeration has to happen inside the client boundary.

## Combobox — nothing to build on

`components/ui/select.tsx` wraps a **native `<select>`**; it is not a base for a combobox (no filtering,
no free text, no listbox). The combobox must be written from scratch, and no dependency may be added
for it without a new ADR.

The hard part is accessibility, and it is a real requirement, not polish: `role="combobox"`,
`aria-expanded`, `aria-controls`, `aria-activedescendant`, a `role="listbox"` popup with
`role="option"` children, arrow/Enter/Escape/Home/End handling, focus retained in the input, and an
`aria-live` count for filtered results. A combobox that only works with a mouse is a defect.

## Testing constraint (inherited, verified twice)

Importing `components/ui/*` under this repo's Vitest config fails — `Button` transitively imports
`@/i18n/navigation`, and there is no jsdom/happy-dom/testing-library in the project at all. Every
existing colocated test asserts on **source text**. That constrains what can be proven automatically:
keyboard interaction and theme-switch behaviour cannot be asserted in Vitest here and must be verified
by running, then listed under "not verified" for the human.

## Gallery integration

The registry test fails if a `components/ui/*.tsx` export has no gallery entry, so the new primitives
must be registered or the suite breaks — that is the intended pressure. `escape-hatch.test.ts` pins the
`render`-override count; charts and the combobox are stateful and may need overrides. Bump the count
deliberately with justification comments; never loosen the guard, which has already been repaired twice.

## Out of scope

Re-theming, the `pine`/`lime` token rename, replacing `Select` with the combobox on existing screens,
the 4 inherited lint warnings.
