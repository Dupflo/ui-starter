# Review — Story s13-gallery-ergonomics

> Fresh-context reviewer subagent. Diff judged: `git diff origin/main...feature/s13-gallery-ergonomics`.
> Every new guard was neutralized rather than read — this project has shipped four vacuous or weak
> guard tests, so a green suite proves nothing on its own.

## Gates — reproduced by the reviewer after `rm -rf .next`

`test` **350/52** (matches the commit's claim exactly) · `test:build` 1/1 · `lint:design` clean, 135
files · `typecheck` clean · `build` clean · `lint` 0 errors, 4 pre-existing warnings.
After the fix commit: **354 tests**.

## The user's complaint is genuinely fixed

On a real `DEMO_MODE=1` artifact, `/fr/ui` serves **54 `<code>` blocks, 54 `Voir le code` toggles, 54
panels carrying `hidden`, zero expanded**. The `aria-controls`/`id` pairs match per instance, so the
wiring survives into the DOM rather than only into the source text. The 1:1 toggle/code ratio also
proves the orphan guard (`if (!code.trim()) return null`) never fires.

**s12's guarantee survived**: 54 blocks, unchanged. The implementer kept the code mounted and
CSS-hidden rather than unmounting it, precisely so that promise stays true.

## Every guard bites — proven by neutralization

| Probe                                                     | Result                         |
| --------------------------------------------------------- | ------------------------------ |
| panel → `{open && (…)}` conditional unmount               | 2 failures                     |
| `CopyButton` moved inside the collapsed panel             | fails                          |
| `aria-expanded` / `aria-controls` removed                 | fails                          |
| toggle labels hardcoded to French                         | fails                          |
| `Example` stops rendering `CodeDisclosure`                | fails                          |
| sizes hardcoded evasively (`"sm md lg…".split(" ").map(`) | fails                          |
| `render: <div />` · `render: someVar` · `render: (…)`     | all three fail both assertions |

The escape-hatch repair holds against all three value forms. The pinned count of 5 is honest — the
per-size loop lives inside `ModalDemo`, so T4 created no new override.

## The `"use client"` trap is real, not a rationalization

The reviewer injected a server-side `Object.keys(sizes)` read into `primitives-section.tsx` and
rebuilt: served HTML showed `SERVERPROBE:[]:TYPE:function`. Next turns **every export** of a
`"use client"` module — not just its components — into an opaque client reference when read from
server code, so the size list came back empty with no error raised. Moving the iteration inside
`ModalDemo` is the correct fix. Derivation confirmed by probe: adding a `4xl` to `modal.tsx` produced
a 7th trigger with zero gallery files touched.

The stated Vitest constraint was verified independently too: importing `@/components/ui/button` fails
under this repo's config (`Cannot find module '.../next/navigation'`), and there is no
jsdom/happy-dom/testing-library in the project — so source-text guards are a genuine constraint here,
not laziness.

## Findings — all minor, all closed before ship

**1 — `modal-sizes.test.ts` had a prose-satisfiable assertion.** `toMatch(/Object\.keys\(sizes\)/)`
still passed with the real call removed, because the file's own doc comment contains that literal.
**This is the fourth weak guard in this project**, after a `git grep -E` using `\b` (git's ERE has
none, so it matched nothing at all), an export scanner blind to `export default`, and an escape-hatch
counter seeing only the parenthesised form. Always the same cause: written without a neutralization
proof. Fixed by stripping comments before matching. Re-probed by the coordinator — mutating the real
call while leaving the comment intact now fails **2** tests, where it previously failed only 1.

**2 — the Modal snippet omitted the `size` prop**, the single prop this story exists to demonstrate:
clicking "Ouvrir (3xl)" gave a wide modal, copying gave a default `md`. `size` is now in the snippet
and pinned by a new test; the escape-hatch comment was rewritten to describe what actually differs.

**3 — the Lightbox justification invented a blocker.** It claimed demonstrating prev/next _"would
require a second real raster asset"_ — false: `images` is a plain array and `go()` wraps modulo its
length, so listing the same asset twice exercises the navigation. The core claim (no size-like table
to enumerate) was true and confirmed. Now `LightboxDemo` lists `sample.png` twice with distinct
captions, so prev/next is demonstrated for the first time and no invented blocker remains.

**4 — ADR 006 broke the repo's ADR convention** (coordinator-authored): French headings, an invented
`Décideur` field, and — worse — a missing `Scope:`, the field AGENTS.md's lifecycle rule keys off.
Realigned on `templates/adr.md`.

**5 — ADR 006 overstated the token guard** (coordinator-authored, and the one that mattered). It said
a literal hex _"casse le build, et c'est le comportement voulu"_. True but misleading:
`check-design-tokens` walks only `app|components|lib`, so it catches hexes a developer types and
nothing else. **Recharts ships default series colours** (`#8884d8` et al.) that apply whenever no
`fill`/`stroke` is passed — an uncoloured chart renders off-palette **with a fully green build**, and
being internal to the library those defaults will not follow the `.dark` re-theme either. That is the
realistic s14 failure mode, and the ADR gave false assurance of protection. Corrected in the ADR and
propagated to s14's trap notes.

## Accepted deviation

`docs/stories.md` and ADR 006 are framing docs that AGENTS.md places on the default branch; they ride
this feature branch instead. The end state after merge is identical, and ADR 006 now carries
`Scope: story s14-dataviz-and-combobox` so its lifecycle is explicit. Noted rather than unwound.

## Not verified — needs a human at recette

- **The gallery in a browser.** Everything was checked in served HTML. Expand a few code blocks, copy
  a snippet and paste it into a real screen, open each Modal size, and step through the Lightbox with
  prev/next — that interaction has now been made demonstrable but nobody has clicked it.
- **Dark mode**, by eye. The token classes are identical to those s12's review already confirmed
  re-theme correctly, but no browser was available.
- **Layout at mobile widths**, with the code collapsed.

## Verdict

The user's two complaints are fixed and measured: code is collapsed behind a per-item toggle without
losing s12's "every item exposes its JSX" guarantee, and modals are demonstrable one trigger per real
size. Every guard in the diff was neutralized and bit. The three findings against the implementation
and the two against the coordinator's ADR were all closed before ship.

Max severity: minor
Ship allowed: yes
