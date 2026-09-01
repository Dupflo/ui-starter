---
validated: yes
---

# Plan — Story s15-gallery-feedback

Branch: `feature/s15-gallery-feedback`
Story: `docs/stories.md` → s15-gallery-feedback. Research: `docs/research/s15-gallery-feedback.md` —
read it first, it carries the real diagnosis for the Select chevron and the grouping design.

## Target

Four recette annotations on the running `/ui` gallery, fixed without weakening s12/s13's
guarantees. Complexity **3**.

## Tasks

- [x] **T1 — spacing in composed blocks.** `space-y-3` (or equivalent) on the root of every
      `blocks-section.tsx` block that currently has none: page header, pricing section, empty state
      (the one circled). Form and stat row already carry deliberate spacing — leave them.
      _Verification_: served HTML shows the class on the three roots; visually re-checked via a real
      browser screenshot.

- [x] **T2 — Select chevron.** Diagnose on the running page before touching code (see research: it's
      a flex-item width collapse in the gallery's preview row, not long option text). Fix in
      `components/ui/select.tsx` (asymmetric `pl-3 pr-9`, matching `locale-switcher.tsx`'s working
      `pr-7` precedent) so it also helps the general case. A regression test pins the asymmetry.
      _Verification_: re-screenshot the gallery's Select, `/settings`'s language select, and the demo
      banner's role select — all three fixed by the one primitive change.

- [x] **T3 — realistic Card examples.** Replace `children: variant`/`children: pad` with a small
      composed body (`SectionLabel` kicker + `Title` + `Text`), matching `StatCard`'s legibility.
      Compose existing primitives only; no new component.
      _Verification_: derived from `cardVariants`/`cardPads` still (no hardcoded list); spacing
      applied per T1's rule.

- [x] **T4 — grouped variants, one code block per component.** A `GroupedExample` in
      `components/gallery/example.tsx` (`items: {snippet, render?}[]`, one preview row, one
      `CodeDisclosure`); `Example` becomes its N=1 case, so every existing call site is unchanged.
      Apply to `Button`, `Badge`, `Card`'s variants+pads, `Title`, `Text`, `SectionLabel`,
      `TextField`'s two states, `Combobox`'s three states — every group is still
      `Object.keys(table).map(...)` over the primitive's own exported table (no recopied list).
      _Verification_: add a probe variant to a primitive's table, confirm it appears in the grouped
      example untouched, revert. `escape-hatch.test.ts`'s pinned count (5) must not move — grouping
      only changes how many `CodeDisclosure`s wrap already-`render`-covered items, not which items
      need `render`.

- [x] **T5 — replace the informal 54-count with a real guarantee.** No automated test currently pins
      any code-block count (the "54" figure was verified by hand in s12/s13's reviews). Add a
      source-level test asserting every `components-map.ts` `COMPONENTS` key appears at least once as
      a `component: "Name"` snippet reference in `primitives-section.tsx` — "every registered
      primitive is reachable and copyable" replaces "every variant has its own card". State the new
      total (primitives + the 5 unchanged blocks) in the report with the reasoning.

- [x] **T6 — gates.** i18n fr+en for any new copy, zero raw colour, clear **and** dark re-checked on
      a real render, `npm run test` · `test:build` · `lint:design` · `typecheck` · `build` · `lint`
      green, `/fr/ui` still 404 on a normal production build.

## Definition of Done

- 6 tasks checked, each verified against the running page (not just the source).
- Gates green, real output pasted in the report.
- Annotations resolved in `annotations.md` removed (with their PNGs) once applied.
- One commit.

## Files touched (prévision)

`components/ui/select.tsx` · `components/gallery/{example,primitives-section,blocks-section}.tsx` ·
new `components/ui/select.test.ts` · new gallery test for T5 · `messages/{fr,en}.json` +
`messages/coverage.test.ts` · `annotations.md` · `annotations/*.png` (deletions) ·
`docs/stories.md` (checkboxes).
