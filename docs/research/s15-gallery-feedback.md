# Research — Story s15-gallery-feedback

Source: 4 annotations captured on the running `/ui` page (`annotations.md`, screenshots in
`annotations/`), human recette on 01/09/2026. Diagnosed against `feature/s15-gallery-feedback`
branched from `main` @ `84541e6` (post s14-dataviz-and-combobox), running `npm run dev:demo` on
`localhost:8000`, inspected with a headless Chromium (`playwright-core` + a cached
`Google Chrome for Testing` binary, installed only in the scratchpad — no dependency added to the
repo) since no GUI/browser is otherwise available in this environment.

## 1. `mtisujnabzm` — spacing in composed blocks

`components/gallery/blocks-section.tsx`'s five blocks: `Title`/`Text`/`Button`/`Card` never apply
their own vertical margin (verified by reading `title.tsx`, `text.tsx`, `card.tsx`,
`section-label.tsx`, `button.tsx`, `badge.tsx` — none touch spacing, by design, so composition
controls it). Three of the five blocks compose siblings with **no spacing className anywhere**:
"page header" (`Container > Title, Text, Button`), "pricing section" (`Card > SectionLabel, Badge,
Title, Text, Button`), "empty state" (`Card > Title, Text, Button` — the one circled). The other two
already carry deliberate spacing: "form" (`div.mt-3.space-y-3` wrapper + `Button.mt-4`, added in
s12's review fix) and "stat row" (`Container.flex.gap-4` around 3 `StatCard`s). `Container` and
`Card` both accept `className` and render `children` directly as DOM children, so `space-y-3` on
the block's own root closes the gap with no new wrapper.

The primitives-section "Card / StatCard" group has the same defect once its variant examples gain
composed content (see #3 below): a bare `Card > SectionLabel, Title, Text` needs the same
`space-y-*` treatment.

## 2. `mtit4rkft6s` — Select chevron

Diagnosed on the real running page (Chromium, `select.w-full.cursor-pointer` inside the gallery's
"Choix" example), not by reasoning alone:

- `select.tsx`'s `selectBase` uses **symmetric** `px-3` (12px each side) — no `appearance-none`, no
  custom icon, no asymmetric reserve, confirmed by reading the file.
- Measured `getBoundingClientRect()` on the live "Choix" select: **102px wide** — barely more than
  "Option A" + the native arrow. Root cause: the `Example` preview row is
  `flex flex-wrap items-center gap-3 p-4`; the `<label className="block">` wrapping the select is a
  flex item with `flex-basis: auto` (no `flex-1`/explicit width), so it shrink-to-fits its content;
  `select`'s `w-full` then resolves against that already-shrunk label, which — for a percentage
  width nested inside an auto-sized flex item — degenerates to the select's own intrinsic
  (content-based) width. The box ends up exactly as wide as its content, leaving the
  browser-painted arrow almost no breathing room against the box's padding/border-radius.
- A 3x-scaled screenshot of the live element (`select-only-before-big.png`, not committed — scratch
  artifact) shows the arrow crammed into the bottom-right corner, visually merging with the rounded
  border curve — reproducing the annotation without needing long option text. **The "long text"
  hypothesis floated in the story brief is wrong**: "Option A" already reproduces it; width, not
  text length, starves the arrow's clearance.
- The same `px-3` symmetric padding is the one thing that's actually fixable in the primitive
  without touching gallery layout: `locale-switcher.tsx`'s own hand-rolled `<select>` already
  reserves **asymmetric** padding for its native arrow (`pl-3 pr-7`, working, unreported). Applying
  the same idea to `select.tsx` (`pl-3 pr-9`, more headroom for the larger `text-sm` size)
  independently fixes both the width-collapse case (grows the intrinsic content box, since padding
  counts toward shrink-to-fit sizing) and the general case (always reserves clearance for the
  arrow, regardless of container). Re-screenshotted after the change: comfortable gap, no more
  corner collision — confirmed on the gallery **and** replayed on `/fr/settings`'s two other
  `Select` call sites (`components/app/settings-form.tsx`'s language select,
  `components/demo/demo-banner-controls.tsx`'s role select in the demo banner), both fixed by the
  same primitive change with no site-specific edit needed.

## 3. `mtit5cqcr4q` — Card examples

`Card`'s variant/pad examples in `primitives-section.tsx` render `children: variant` (e.g. `"pine"`,
`"lg"`) — a bare string, nothing else. `StatCard`, the sibling example right next to them, already
composes real content (`label`/`value`/`trend`) and reads instantly. `settings-form.tsx` has its own
ad-hoc local `Card` (not the primitive — out of scope) that wraps a `Title` + content, which is the
closest in-repo precedent for "what a Card actually holds": a kicker/label, a heading, a line of
body copy. No new primitive needed — `SectionLabel` (already used elsewhere as a kicker), `Title`,
`Text` compose it.

## 4. `mtit5zbxei1` — grouped variants

Confirmed by counting `Object.keys()` entries in `primitives-section.tsx`: `Badge` renders 10 cards
(7 tones + 2 sizes + 1 dot), `Button` 11 (6 variants + 4 sizes + 1 disabled) — each its own
`<Example>` (own card, own "Voir le code", own "Copier"), inside `ExampleGrid`. No automated test
currently pins a global code-block count — the "54" figure the story brief and s12/s13's reviews
cite was verified **manually**, by curling a `DEMO_MODE=1` served page and counting `<code>` tags by
hand; nothing in the suite would catch a regression either way. That absence is itself a gap this
story closes (see plan T4).

`Example`'s shell (`overflow-hidden rounded-xl border` + preview row + one `CodeDisclosure`) already
generalizes cleanly to N items: a `GroupedExample` taking `{snippet, render?}[]` renders every item's
preview in the same flex-wrap row and joins every item's `codeOf(snippet)` into one code block.
`Example` itself becomes the N=1 case, so every existing single-item call site (`Modal`, `Lightbox`,
`TextFieldDemo` escape hatches, all five composed blocks) is untouched.

Grouping candidates — sections where every item is the **same** primitive with different
props (matches the AC's own examples: "tons et tailles de Badge, variantes de Button"): `Button`
(11→1), `Badge` (10→1), `Card`'s variants+pads (5→1, `StatCard` stays its own card — different
component), `Title` (4→1), `Text` (6→1), `SectionLabel` (3→1), `TextField`'s two demo states (2→1,
`FieldLabel` stays its own card), `Combobox`'s three demo states (3→1). Left ungrouped: `Container`,
`Select` (already single items), `Modal`, `Lightbox` (single, stateful), the three `Chart*`
components (three _different_ components, not variants of one), `LocaleMenu`/`LocaleSwitcher` (two
different components). Escape-hatch count (`TextFieldDemo`×2, `Modal`, `Lightbox`, the form block —
pinned at 5) is unaffected: grouping only changes how many `CodeDisclosure`s wrap a set of already-
rendered items, not which items still need a client-rendered `render` override.

Net effect: **one code block per `COMPONENTS` entry** (19 keys in `components-map.ts`) for the
primitives section, plus the 5 unchanged composed blocks = **24**, down from 54. This is a stronger
guarantee than the raw count it replaces — "every registered primitive has exactly one reachable,
copyable code block" is what the count was always a proxy for, and grouping now makes that the
literal, testable invariant instead of an emergent side effect of one-card-per-variant.
