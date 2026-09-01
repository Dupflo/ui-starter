# Research — Story s17-data-table

Branch: `feature/s17-data-table`, base `main` (post s16-gallery-fixes). Written after the fact
(review finding, docs/reviews/s17-data-table.md: this file was missing) — it records what the
story's live verification actually established, not a re-run of it.

## `rowKey` as a field name, not a callback — a real build failure, not a style preference

The first shape considered for identifying a row for React's list `key` was the familiar callback:
`rowKey: (row: Row) => string | number`. That shape does not survive this repo's split between
`components/gallery/primitives-section.tsx` (a Server Component that renders `DataTable` directly,
with no client wrapper, for the bare-primitive gallery entry) and `data-table.tsx` (`"use client"`).
Reproduced with a real `DEMO_MODE=1 next build`: passing a plain arrow function as `rowKey` from the
Server Component fails the build with **"Functions cannot be passed directly to Client
Components because they're not serializable."** — the same class of error already known from
`TextField`'s `registration` (react-hook-form's `ref` callback) in s12/s15.

`rowKey: keyof Row & string` sidesteps it: a field name is fully serializable across the
Server→Client boundary, and reuses the exact `keyof Row & string` shape `Column.key` already needed
for T1's compile-time guarantee. No new pattern, no escape hatch needed for this particular prop.

## Keyboard activation of the sort header — Enter and Space both work

`components/ui/data-table.tsx` renders a sortable column header as a real `<button type="button">`
wrapping the header text (never a `<th onClick>`), specifically so the control is keyboard-actionable
by construction (native button semantics). This repo's Vitest config has no jsdom/happy-dom/
testing-library (see `components-map.test.ts`'s header), so nothing here is exercised by the unit
suite — verified instead on the real DOM, `npm run dev:demo` on `localhost:8000`, headless Chrome
driven via CDP.

Initial attempt used Playwright-style `keyboard.press`, which did not register on the focused
header button in this environment. Dispatching **raw CDP** `Input.dispatchKeyEvent` sequences
(`rawKeyDown` → `char` → `keyUp`) directly at the focused button did: both **Enter and Space**
toggle the sort (ascending → descending → ascending on repeat activation) and visibly reorder the
rendered rows, with `aria-sort` flipping between `"ascending"`/`"descending"` on the active column.
There is no tooling limitation here — the control is genuinely keyboard-operable via both of the
native activation keys a `<button>` is expected to answer to.

## Responsive — horizontal scroll, not a card adaptation

Two shapes exist in the wild for a data table on narrow viewports: keep table semantics and let the
table scroll horizontally inside a fixed-width wrapper, or restructure into a list of cards below a
breakpoint. The second needs its own accessible structure (the visual "table" stops being a
`<table>` in any meaningful sense — headers become per-field labels repeated per card, which is a
different component, not a responsive tweak to this one). That is out of this story's scope (T8 asks
to "decide explicitly and say so", not to build a second layout).

Decision: `overflow-x-auto` around the `<table>` (`data-table.tsx`), semantics kept intact. Verified
on the real DOM at a narrow viewport width: the table scrolls horizontally inside its rounded
container, headers and `aria-sort` unaffected, no layout collapse.

## Review fix pass (docs/reviews/s17-data-table.md)

One MAJOR (`DataTableSort.key` shipped as bare `string`, not `keyof Row & string` — a `defaultSort`
typo compiled clean and silently sorted nothing) and six MINORs were fixed on top of the story
commit; see the review file and the fix commit for the detail. Nothing in that pass changed any of
the three findings recorded above — they still hold as described.
