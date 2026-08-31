# Research — Story s12-ui-gallery

Branch: `feature/s12-ui-gallery` · Base: `main` @ `5e8a0c9` (s01→s11 merged)

## The real problem

Not "render some components on a page" — that is an afternoon. The problem is that a gallery is a
_second description_ of the design system, and this repo has now been bitten twice by exactly that:
`docs/design-system.md` documented a green palette three stories after s02 re-themed to slate/indigo,
and the demo banner told users state resets on restart after it stopped doing so. A gallery that
hardcodes its variant lists becomes the third instance, and it will be worse than the first two
because it _looks_ authoritative.

So the design question is: **can the gallery derive what it shows from the components themselves?**

## Current component surface — measured

13 primitives in `components/ui/`. What each one actually exports:

| File                  | Exports                                              |
| --------------------- | ---------------------------------------------------- |
| `badge.tsx`           | `Badge`                                              |
| `button.tsx`          | `Button`                                             |
| `card.tsx`            | `Card`, `StatCard`                                   |
| `container.tsx`       | `Container`                                          |
| `lightbox.tsx`        | `Lightbox`                                           |
| `locale-menu.tsx`     | `LocaleMenu`                                         |
| `locale-switcher.tsx` | `LocaleSwitcher`                                     |
| `modal.tsx`           | `Modal`                                              |
| `section-label.tsx`   | `SectionLabel`                                       |
| `select.tsx`          | `SelectOption` (type), `Select`                      |
| `text-field.tsx`      | `fieldBase`, `fieldState`, `FieldLabel`, `TextField` |
| `text.tsx`            | `Text`                                               |
| `title.tsx`           | `Title`                                              |

**The blocker for derivation**: every variant table is a module-private `const`, and the union types
are declared but not exported.

```
components/ui/button.tsx:4   type Variant = "primary" | "pine" | "outline" | "ghost" | "subtle" | "danger"
components/ui/button.tsx:5   type Size    = "sm" | "md" | "lg" | "icon"
components/ui/section-label.tsx:3  type Tone = "muted" | "lime" | "pine"
components/ui/card.tsx:3     type CardVariant = "surface" | "pine"
components/ui/title.tsx:13   type Heading = keyof typeof looks
```

`badge.tsx`, `text.tsx` and `modal.tsx` do the same with inline `keyof typeof` on unexported objects.

So today a gallery **cannot** enumerate variants without either (a) exporting them, or (b) copying the
lists by hand — which is the failure mode above.

## Options

**A — copy the lists into the gallery.** Zero change to the primitives. Drifts the first time anyone
adds a `Button` variant; nothing fails. **Rejected** — this is the exact defect s10 existed to clean up.

**B — export the variant tables from each primitive, iterate over them.** A one-line `export` on each
`const`/`type`. The gallery maps over `Object.keys(variants)`, so a new variant appears automatically
and a removed one disappears. Widens each primitive's public API by one symbol, which is honest: the
variant list _is_ public API — every call site already depends on those strings.
**Retained.**

**C — parse the source at build time.** Derives without touching the primitives, but a regex over TSX
is a fragile second implementation of the type system. Rejected.

**Even with B, a test is still needed.** Exporting the table guarantees the gallery iterates the real
list; it does not guarantee the gallery _renders_ each entry, nor that a newly added primitive gets a
section at all. The check that actually holds: a test that reads `components/ui/*.tsx`, collects the
exported component names, and fails if one has no entry in the gallery's registry. That is the
"a new component cannot be silently missing" guarantee, and it is the story's load-bearing criterion.

## Blocks — what to compose

The five blocks must be assembled **only** from existing primitives. Candidates grounded in screens
that already exist in this repo, so they are known-composable rather than invented:

- page header (`Container` + `Title` + `Text` + `Button`) — as on `/dashboard`
- pricing section (`Card` + `Badge` + `Button` + `SectionLabel`) — as on `/pricing`
- form (`FieldLabel` + `TextField` + `Button`) — as in the auth screens
- empty state (`Card` + `Title` + `Text` + `Button`)
- stat row (`StatCard` ×3) — `StatCard` already exists in `card.tsx` and is used on `/dashboard`

## Showing the code alongside the render

The AC requires the displayed JSX to match what is rendered. Two sources = guaranteed drift, in the
smallest possible loop. The honest options are to render _from_ the snippet string, or to derive the
snippet from a single structure that also produces the render. Whichever is chosen, **a test must pin
that the two cannot diverge** — otherwise this criterion is decorative.
Copy-to-clipboard needs `navigator.clipboard`, so that part is a client component; the gallery itself
should stay a server component and keep the client boundary as small as possible.

## Traps

- `Modal` and `Lightbox` mount a portal and have open/closed state. Showing them requires a trigger
  and must not break the gallery's own layout. `Modal` also has 4 pre-existing
  `react-hooks/set-state-in-effect` lint warnings — do not "fix" them here, they are inherited.
- `LocaleSwitcher` / `LocaleMenu` navigate on change; in a gallery they would move the user off the
  page. Decide deliberately how to present them (or that they are listed, not exercised).
- `check-design-tokens` now flags raw hex, raw colour functions and bare palette utilities across
  `app|components|lib` with a 12-entry allowlist. A gallery displaying colour swatches is the obvious
  place to violate it — swatches must come from token classes.
- Every string must be i18n fr+en (`messages/coverage.test.ts` enforces key parity both ways).
- The route must render in light **and** dark. The app shell puts `.dark` on an ancestor div, and
  `.light-scope` exists — a gallery that hardcodes one register will look broken in the other.

## Open decision for the plan

**Public route or behind auth?** Public = usable in demo mode without signing in, but ships in
production for real users to find. Protected = hidden, but then it is invisible in the demo unless the
demo user is signed in (they are, by default). A third option is to gate it on `isDemoMode()` or on
`NODE_ENV`, reusing the flag machinery s11 already built and proved. This must be decided explicitly,
not defaulted into.

## Out of scope

Storybook or any new dependency. Re-theming. Renaming `pine`/`lime`. Fixing the 4 inherited lint
warnings. Adding primitives — a gap is to report, never to fill here.
