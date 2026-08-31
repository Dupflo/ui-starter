---
validated: yes
---

# Plan — Story s12-ui-gallery

Branch: `feature/s12-ui-gallery`
Research: `docs/research/s12-ui-gallery.md` — read it first; this plan does not repeat the component
inventory or the options analysis.

## Target story

Une page qui montre toutes les primitives UI et des blocs prêts à assembler, avec leur code à copier.
Complexité réelle : **3**. La difficulté n'est pas de rendre des composants, c'est d'empêcher la
galerie de devenir une troisième description du design system qui dérive du code.

## Decisions taken before implementation

**Route visibility — human decision (31/08/2026): dev and demo only.** The gallery is a workshop
tool, not product surface. It resolves through the same `isDemoMode()` machinery s11 built and
proved, OR in development; a normal production build must 404 it. Rationale: every SaaS forked from
this starter would otherwise ship its own component gallery to its users, and nobody would remember
to remove it. Rejected: public (ships everywhere), behind auth (still reachable by every real
signed-in user).

**Derivation over duplication.** Variant tables are exported from each primitive and iterated. A
gallery that copies its lists is the exact defect s10 spent a whole story cleaning up — twice over,
since `docs/design-system.md` had drifted and so had the demo banner's own text.

## Tasks

- [x] **T1 — export the variant tables.** In `components/ui/*`, export the currently module-private
      variant maps and their union types (`button.tsx` `Variant`/`Size`, `badge.tsx` tones/sizes,
      `card.tsx` `CardVariant`, `title.tsx` `looks`, `text.tsx` sizes/tones, `section-label.tsx` `Tone`,
      `modal.tsx` sizes). Change **nothing else** in those files — no behaviour, no class strings.
      _Vérification_: `typecheck` + `build` green, and `git diff` on each primitive shows only added
      `export` keywords.

- [x] **T2 — the registry, and the test that makes it load-bearing.** One structure listing every
      primitive to display. Then the guarantee: a test that reads `components/ui/*.tsx`, collects the
      exported component names, and **fails if any has no registry entry**. Write it failing first
      (remove an entry, watch it go red). This is the story's load-bearing criterion — exporting the
      tables makes variants derive, but only this test stops a whole new primitive from being silently
      absent.

- [x] **T3 — single source for render + snippet.** The AC requires the displayed JSX to match what is
      rendered above it. Two sources drift immediately. Derive both from one structure, or render from
      the snippet. **A test must pin that they cannot diverge** — otherwise the criterion is decorative.
      Copy-to-clipboard needs `navigator.clipboard`: keep that the only client component, gallery stays
      a server component.

- [x] **T4 — primitives section.** Every primitive, every variant/tone/size derived from T1, plus the
      real states that exist (`disabled`, error). `Modal` and `Lightbox` mount portals and need a trigger
      — present them without breaking the gallery's layout. `LocaleSwitcher`/`LocaleMenu` navigate on
      change: decide deliberately whether to exercise or merely list them, and say which in the report.

- [x] **T5 — five composed blocks**, from existing primitives only: page header, pricing section,
      form, empty state, stat row (`StatCard` already exists). A need not covered is a **design system
      gap to report**, never to fill here.

- [x] **T6 — route gating.** `/ui` renders in dev and in demo, 404s on a normal production build.
      _Vérification_: build normally, `next start`, `curl /fr/ui` → **404**; then `DEMO_MODE=1` build →
      **200**. Paste both status codes. Do not weaken or duplicate `isDemoMode()` — it is the single
      reader, and `lib/demo/flag.test.ts` guards that.

- [x] **T7 — i18n + dark mode.** All strings fr+en (`messages/coverage.test.ts` enforces parity).
      Renders in light and dark: the shell puts `.dark` on an ancestor div. Colour swatches, if any, come
      from token classes — `check-design-tokens` flags raw hex across `app|components|lib`.

## Definition of Done

- 7 tasks ticked, each with its verification run.
- Gates: `test` · `test:build` · `lint:design` · `typecheck` · `build` · `lint` (4 inherited warnings
  tolerated, 0 errors).
- `/fr/ui` 404 on a normal production build, 200 under `DEMO_MODE=1` — both pasted.
- One commit on `feature/s12-ui-gallery`.
- No new dependency. No primitive invented. No token value changed.

## Files touched (prévision)

`app/[locale]/ui/*` (new) · `components/ui/*` (export lines only) · `components/gallery/*` (new) ·
`messages/{fr,en}.json` · colocated tests.
