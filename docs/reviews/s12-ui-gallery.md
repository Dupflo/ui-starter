# Review — Story s12-ui-gallery

> Fresh-context reviewer subagent. Diff judged: `git diff origin/main...feature/s12-ui-gallery`
> (`bdc2b0a`, 2 commits). Every anti-drift claim was probed empirically rather than read.

## Gates — reproduced by the reviewer after `rm -rf .next`

| Gate                  | Result                                                                   |
| --------------------- | ------------------------------------------------------------------------ |
| `npm run test`        | 47 files / **325 tests** passed — the commit message's count is accurate |
| `npm run test:build`  | 1 passed                                                                 |
| `npm run lint:design` | clean, 129 files, 12 allowlisted                                         |
| `npm run typecheck`   | clean                                                                    |
| `npm run build`       | success                                                                  |
| `npm run lint`        | 0 errors, 4 warnings — all inherited, **none in `components/gallery/`**  |

Route gating reproduced for real: normal prod build + `next start` → `/fr/ui` **404** (`/en/ui` too);
`DEMO_MODE=1` build → `/ui` **200**, `/en/ui` **200**.

## The anti-drift guarantees — probed, not read

**Variants are genuinely derived.** A 7th `Button` variant `probe7` was added to the primitive, no
gallery file touched: the page rendered a new card with `<Button variant="probe7">probe7</Button>` in
both the live element and the code block. Reverted. No variant list is hardcoded anywhere in
`components/gallery/*` — every one is `Object.keys()` over the table T1 exported from the primitive's
own module.

**The new-primitive guard bites.** A throwaway `components/ui/zz-probe.tsx` turned
`components-map.test.ts` red by name. Renaming `Badge`→`Chip` fired **both** assertions (missing
`Chip`, stale `Badge`).

**The single-`DEMO_MODE`-reader invariant holds under attack.** Rewriting the gate in
`app/[locale]/ui/page.tsx` to read `process.env.DEMO_MODE` directly made `lib/demo/flag.test.ts` fail
by name. The dev branch cannot leak to production either: `NODE_ENV` is Next-inlined to `"production"`
in a prod build and is a distinct key.

**T1 was export-only**, confirmed independently: added `export` keywords plus a Prettier wrap on
`Button`'s longer union and `type Heading` → `export type Heading`. Zero class-string or behaviour change.

**`LocaleMenu`/`LocaleSwitcher` do not navigate the user away**: both call
`router.replace(pathname, { locale })` with the locale-agnostic `usePathname()`, so `/fr/ui` → `/en/ui`.

**Dark mode is clean**: `theme-toggle.tsx` contains no `localStorage`; `app-shell.tsx` remains the only
writer of the persisted key. Every class the gallery uses is overridden in `globals.css`'s `.dark` block.

## Findings

### major — four of fifteen registered components expose no JSX and no copy button

AC: _"Chaque item expose son JSX, copiable en un geste."_ The served page has 47 code blocks covering
`Badge, Button, Card, Container, FieldLabel, SectionLabel, Select, StatCard, Text, TextField, Title`.
**`Modal`, `Lightbox`, `LocaleMenu` and `LocaleSwitcher` have none** — verified by locating each `<h4>`
group heading in the served HTML: no `<code>`, no `Copier`. In `primitives-section.tsx` those groups
render `<ModalDemo/>`, `<LightboxDemo/>`, `<LocaleMenu/><LocaleSwitcher/>` directly, bypassing `Example`.

Compounded by a doc comment describing code that does not exist: `example.tsx` says _"The code block
underneath is unaffected — `codeOf(snippet)` still derives from the same snippet… See
TextFieldDemo/ModalDemo/LightboxDemo."_ `TextFieldDemo` does go through `Example`; `ModalDemo` and
`LightboxDemo` never reach it, so there is no code block underneath to be unaffected.

### major — the form block's displayed code demonstrably diverges from its render

AC: _"le code affiché ne peut pas diverger du rendu (source unique, garantie par un test)."_
`blocks-section.tsx`'s form block supplies a hand-composed `render` the `snippet` does not describe: a
wrapper `<div className="mt-3 space-y-3">` and a `className="mt-4"` on the `Button`, both present in the
preview and **absent from the copyable code**. Copy-pasting reproduces a visibly different layout.

`snippet.test.ts` never touches this path — it exercises `codeOf`/`renderSnippet` against a fake
components map, proving the _machinery_ cannot diverge while the `render` prop, the one thing that
actually can, is unpinned. The escape hatch is legitimate (rendering a react-hook-form `ref` from a
Server Component genuinely throws), but it is unbounded and **already drifted on its first use**.

### minor — the new-primitive guard has two silent holes

`exportedComponentNames` matches `/^export (?:function|const) ([A-Z][A-Za-z0-9]*)\b/gm`. Probed:
`export const X = memo(...)` → caught; `export default function X()` → **silently missed**;
`function X(){}; export { X }` → **silently missed**. `readdirSync` is also non-recursive, so
`components/ui/foo/index.tsx` would evade it. Nothing is missing today, but `export default` is the
most common React component idiom and this test is the story's load-bearing guarantee.

### minor — hardcoded UI copy in the `Select` example

`options: [{ label: "Option A" }, { label: "Option B" }]` are user-visible strings rendered in the
`<select>` and shown in the code block, not routed through i18n, while the sibling `selectLabel` is.

### minor — `Card`'s `pad` table is neither exported nor displayed

`const pads: Record<CardPad, string>` (`sm|md|lg`) stays module-private and `CardPad` unexported, so the
gallery shows only `Card`'s two variants. A reader never learns `pad` exists — the "second description
that omits part of the system" failure mode in miniature. The plan's T1 enumerated the tables to export
and omitted `pads`: the gap originates upstream, not with the implementer.

### minor — process: the acceptance criteria were authored on the feature branch, after implementation

AGENTS.md puts framing docs including `docs/stories.md` on the default branch, and both it and the plan's
DoD say one commit per story; the branch has two. `origin/main:docs/stories.md` genuinely ends at s11, so
the entry was absent and the reconstruction was necessary. The consequence worth naming: **the criteria
this story is judged against are not an independent specification.** Their content is consistent with the
human-validated plan, so this is not a correctness issue — but the human should review the reconstruction
rather than inherit it as authority.

## Not findings — checked and clear

No new dependency (`package.json` untouched). No token value changed, no raw colour, `check-design-tokens`
clean. No primitive invented; the five blocks compose only existing primitives. No cemetery item touched.
`CopyButton` is the only client component reached through `Example`; the gallery body stays a Server
Component. The 44-key `gallery` namespace exists in both locales and is wired into
`messages/coverage.test.ts`. `public/gallery/sample.png` is 68 bytes, justified at its use site, and
s10's `public-assets.test.ts` still passes. No ADR contradicted. All 7 plan tasks genuinely done.

## Verdict — first pass

The headline promise held under attack, but the code-display criterion failed in both directions.

Max severity: major · Ship allowed: yes (findings closed before ship)

---

# Second pass — after `2d5c796`, verified by the coordinator

**Major 1 closed.** All four components now route through `Example`. Served HTML on a `DEMO_MODE=1`
artifact: **54 `<code>` blocks, 57 copy buttons**, and `Modal`, `Lightbox`, `LocaleMenu`,
`LocaleSwitcher` each appear in one. `LocaleMenu`/`LocaleSwitcher` take no ref-bearing props, so they
render straight from their `Snippet` with no escape hatch at all — only `previewClassName` was added,
so their pine-styled chrome stays legible on the paper preview card. `example.tsx`'s doc comment was
rewritten to describe what exists rather than what was intended.

**Major 2 closed.** `renderSnippet` now treats a lowercase `component` name as a literal host element,
so the form block's spacing wrapper and the Button's `className` live in the snippet itself instead of
a hand-composed override. Verified in the served HTML: `mt-3 space-y-3` appears in both the render and
the code block.

### The guard added to close the hole had the same hole it was closing

`escape-hatch.test.ts` requires an `ESCAPE HATCH` justification comment above every `render:` usage and
pins the total at 5. But its pattern was `/render:\s*\(|render=\{(?!render\})/` — **only the
parenthesised form**. A probe adding `render: <div />` as a 6th usage left the suite green.

Widened to `/(?:^|[\s{,])render:\s*\S|render=\{(?!render\})/` and re-probed with all three shapes:

| Probe               | Before     | After  |
| ------------------- | ---------- | ------ |
| `render: (<div />)` | caught     | caught |
| `render: <div />`   | **missed** | caught |
| `render: someVar`   | **missed** | caught |

This is the third guard test this session whose pattern did not match what it claimed to guard — after
`git grep -E "…\b"` (git's ERE has no `\b`, so it matched nothing at all) and
`exportedComponentNames` missing `export default`. The lesson is not about regexes: **a guard test is
only worth what its neutralization proof shows**, and all three were written without one.

### Minors closed

`exportedComponentNames` widened to catch `export default function X` and `function X(){}; export { X }`,
and made recursive — each proven with throwaway files. The `Select` example's options now go through
i18n (fr+en, wired into the coverage test). `Card`'s `pads`/`CardPad` exported and displayed; that
omission was in the plan's T1, not the implementation.

### Gates, re-run by the coordinator

`test` **329/329 (48 files)** · `test:build` 1/1 · `lint:design` 130 files clean · `typecheck` clean ·
`build` success · `lint` 0 errors, 4 inherited warnings, none in `components/gallery/`.
Route gating re-verified on both artifacts: `/fr/ui` **404** on a normal production build, **200** under
`DEMO_MODE=1`.

## Not verified — needs a human at recette

- **The gallery in a browser.** Everything was checked in served HTML. Open `npm run dev:demo` and go to
  `/fr/ui`: click a copy button and paste the result, open the Modal and the Lightbox, switch locale from
  inside the gallery (it should land on `/en/ui`, not throw you out), and flip the page-local dark toggle.
- **Whether the copied JSX actually compiles** when pasted into a real screen. The code is derived from
  the same snippet that renders, but nobody has round-tripped it.
- **Layout at mobile widths** — the gallery is long and dense.
- **`public/gallery/sample.png`** (68 bytes, 1×1) ships to every fork because `Lightbox`'s internal
  `next/image` rejects SVG and exposes no `unoptimized` escape. Decide whether that is acceptable or
  whether `Lightbox` should gain the escape hatch in a later story.

## Verdict — final

Both majors are closed and independently re-verified, and the guard meant to prevent the escape hatch
from growing silently was itself found leaky and fixed — with a neutralization proof this time. The
story's headline guarantees hold under attack: variants derive from the components, a new primitive
cannot be silently missing, and the gallery cannot reach a production build.

Max severity: minor
Ship allowed: yes
