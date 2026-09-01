# Review — Story s15-gallery-feedback

> Fresh-context reviewer subagent. Diff judged: `git diff origin/main...feature/s15-gallery-feedback`.
> Origin: **four visual annotations drawn by a human on the running gallery**, not a spec. Every claim
> likely to be hallucinated was probed against a real DOM on a `DEMO_MODE=1` artifact.

## Gates — reproduced by the reviewer

`test` **414/66** (matches the commit exactly) · `test:build` 1/1 · `lint:design` 154 files ·
`typecheck` clean · `build` clean · `lint` 0 errors, 4 pre-existing warnings in untouched files.
After the final fix commit: **419 tests**.

A stale `next-server` on :3000 was killed before measuring — leftover processes have produced
misleading results in this project before. `/fr/ui` → 307 → `/ui` → **404** on a normal build
(`/fr/pricing` → 200, so the server was healthy); **200** under `DEMO_MODE=1`.

## The four annotations, resolved

**Spacing.** Three of the five composed blocks had no spacing className at all — none of
`Title`/`Text`/`Card`/`Button` carry their own margin. `space-y-3` added to the three that stack;
the stat row is `flex flex-wrap gap-4` (horizontal, correctly excluded) and the form block already
had it.

**The `Select` chevron — the coordinator's hypothesis was wrong.** Not long text colliding with the
native arrow. Diagnosed live with a headless browser: the gallery's flex preview row collapses the
wrapping `<label>` to shrink-to-fit, so `select`'s `w-full` degenerates to content width (**102px
measured**), leaving the native arrow almost no clearance. Fixed with asymmetric `pl-3 pr-9`,
mirroring `locale-switcher.tsx`'s existing `pl-3 pr-7` — the reviewer confirmed that precedent is
real, not invented. All three call sites verified (`settings-form.tsx:221`,
`demo-banner-controls.tsx:104`, the gallery); **neither consumer passes a `className`**, so there is
no tailwind-merge conflict and no full-width regression.

**Card examples.** Were empty boxes containing only the variant name, beside a `StatCard` showing
"Utilisateurs actifs / 128 / +4%" — that contrast was the annotation's whole argument. Now compose
`SectionLabel` + `Title` + `Text`. Giving them content exposed a contrast bug on the `pine` variant,
which the implementer caught and fixed by deriving the override from the variant's own class string.

**Grouping — 54 → 24 code blocks.** One per registered component instead of one per variant.

## The measurement that changed, and the guarantee that replaced it

Every prior review verified s12's _"chaque item expose son JSX"_ by **hand-counting 54** —
`git grep 54 origin/main` finds that number only in review prose and one code comment. **No test ever
pinned it.**

The 24 is real: on a `DEMO_MODE=1` artifact with `<script>` blocks stripped, 24 `<code>`, 24 `</code>`,
24 `<pre>`, 24 preview rows — one to one, and exactly one per `COMPONENTS` key (19) plus 5 composed
blocks.

`primitives-reachability.test.ts` replaces the hand-count and is **strictly stronger**: neutralized by
renaming `component: "Container"`, it went red naming `Container`. The guarantee now asserts every
registered component is reachable, independent of how many variants share a block.

**Derivation proven live — one probe showed three things at once.** Adding `probeVisible: "bg-danger
text-paper"` and `probeInvisible: "text-paper"` to `button.tsx` and rebuilding:

- both appeared in the grouped example with **zero gallery files touched** → derived, not a copied list
- the code-block count stayed **24** despite +2 variants → grouping genuinely decouples variants from blocks
- `probeInvisible` was automatically wrapped in a `bg-pine` patch, `probeVisible` was not

## The third occurrence of an old defect, and the guard that was missing

`Button`'s `outline` (`border-paper/25 text-paper`) and `ghost` (`text-paper/80`) carry no background
of their own and were rendered on the preview row's `bg-paper` — **invisible**. Confirmed pre-existing
on `origin/main`, not a regression.

This is the **third occurrence of the `text-X`-on-`bg-X` class in this project**, after `/pricing`'s
wordmark (s01, third review) and the five `Logo` call sites re-derived in s10. A gallery whose purpose
is judging components, rendering two of them invisibly, is worse than not showing them.

Fixed in the gallery, not in `Button` — those variants are correct for the surface they were designed
for. `surface-contrast.ts` parses the class string; the patch is derived, never a hardcoded name list.

### The guard was initially a change-detector, and was rewritten

`surface-contrast.test.ts` first asserted the **exact set** `["ghost","outline"]`. When the reviewer
added a probe variant the gallery **provably handled correctly**, the test went red demanding the name
be appended — its only remedy being to edit the list until green, which is precisely the reflex that
produced five vacuous guards in this project.

Rewritten to assert the real invariant: **every invisible variant receives a patch**. Re-probed by the
coordinator in both directions — adding an invisible variant **stays green** (it is handled), breaking
the wiring to a hardcoded `variant === "outline" || variant === "ghost"` **goes red** (2 failures).
That is a guard rather than a snapshot.

## Findings — all minor, all closed before ship

- A load-bearing comment in `code-disclosure.tsx` still cited "54 across 15" — the count that justifies
  the keep-the-code-mounted decision. Now "24 across 19", re-verified by DOM query.
- `pb-40` (160px) was justified in two places as covering `max-h-60` (240px). It does not; it covers
  today's 3-option popup (~122px). Decision: keep the smaller reserve rather than pad for a height
  nothing renders, correct both comments, and **add a test asserting no demo option list exceeds 3** —
  proven by adding a 4th option and watching it fail.
- The Card dark-variant comment claimed to avoid a hardcoded assumption while substituting
  `includes("text-paper")`. Narrowed to `textToken(classes) === "paper"` and the comment now states the
  real limit: the override literal cannot be derived because Tailwind cannot build `text-${token}`
  (ADR 002).
- The Button group's `bg-pine` patch was unexplained where the neighbouring locale group carries a
  caption; a `buttonDarkCaption` was added, fr+en.

**Process notes, not defects**: the story entry and the plan were authored on the feature branch rather
than the default branch (AGENTS.md files `docs/stories.md` as framing) — pragmatic, since the story
originated from annotations mid-flight, and harmless under squash-merge. Three commits, squashed at
merge.

## Not verified — needs a human at recette

- **The gallery by eye.** Everything was queried from the DOM. Look at `/ui`: the grouped Button and
  Badge rows, the dark patch behind `outline`/`ghost`, the Card examples' new content, the Select
  chevron on all three surfaces, and the Combobox popup clearing its footer — in light **and** dark.
- **Whether 24 blocks reads better than 54.** That was the point of the annotation, and only you can
  judge it.
- **The `pb-40` reserve** if you ever add a 4th option to the Combobox demo — the new test will catch
  it, but the visual call is yours.

## Verdict

The three claims most likely to be hallucinated — the 54→24 count, the derived-variant guarantee, and
the `locale-switcher` padding precedent — all survived direct probing against a real DOM, and the
surface-contrast fix is genuinely derived rather than a disguised hardcode. The findings were
documentation precision and test-design ergonomics, and the most valuable one turned a change-detector
into an actual guard.

Max severity: minor
Ship allowed: yes
