# Review — Story s17-data-table

> Fresh-context reviewer subagent. Diff judged: `git diff origin/main...feature/s17-data-table`.
> This adds a primitive to a starter every future project forks, and a data table is the component
> most likely to be used wrongly for years if its API is wrong. Everything was driven against a real
> browser and a real build; every test in the diff was neutralized.

## Gates — reproduced by the reviewer

`test` **456/71** (matches the commit exactly) · `test:build` 1/1 · `lint:design` 161 files ·
`typecheck` clean · `build` clean · `lint` 0 errors, 4 pre-existing warnings in untouched files.
`package.json` and the lockfile: **zero diff — no dependency added.** Code blocks by DOM query: **26**,
matching the claim. `/fr/ui` 404 on a normal build, 200 under `DEMO_MODE=1`.
After the fix commit: **460 tests, 72 files**.

## Verified sound, independently

**Accessible names come from real `<caption>` elements** — `Accessibility.getFullAXTree` reports two
`role: "table"` nodes named "Tableau de démonstration" and "Liste des utilisateurs", both from
`relatedElement:tablecaption`. 7 `columnheader`, all with `scope="col"`; `aria-sort` on exactly the 5
sortable ones. **`caption` is a required prop**, so s14's failure mode — a name coming from an optional
prop, hence absent when that prop is — is structurally impossible here.

**Sorting genuinely sorts.** Click cycle `none → ascending → descending → ascending`, the glyph
follows, **and the rows actually reorder**. Stable (`[...rows].sort`, verified on a column with tied
values keeping insertion order); numeric columns compare numerically.

**Keyboard — and the implementer was under-confident.** They reported being unable to verify Enter and
honestly said so, after reproducing the failure on a vanilla button on `about:blank` to rule out an app
defect. The reviewer got it working: **Enter and Space both activate**, cycling the sort and reordering
rows. The header is a genuinely focusable `<button>`, not a `<th onClick>`.

**Pagination** slices real rows; resorting while on page 2 returns to page 1, matching the documented
T4 decision. **Empty and loading states** are valid table structure (correct `colSpan`, footer
suppressed, never co-present) — the s14-class mutation (a bare text node in `<tbody>`) turns the suite
red.

**The `rowKey` fix is sound**, and the other function-shaped prop was checked: `cell` never crosses the
Server→Client boundary, because the Users block builds its `columns` **inside** the `"use client"`
module. The escape-hatch bump 5 → 6 is real and minimal. The registry test covers `DataTable`
**unmodified** — removing it from `COMPONENTS` fails by name.

**Mutations**: four of the implementer's five re-run, plus four of the reviewer's own — dropping
`<caption>`, `colSpan={1}`, removing the numeric branch, an off-by-one page slice. All caught.

**Responsive**: at 375px the page does not overflow (`scrollWidth === clientWidth === 375`); the table
scrolls inside its own container. The declared decision, honoured.

## Findings

### major — the typing invariant, the story's centerpiece, stopped at `defaultSort`

`Column.key` and `rowKey` were `keyof Row & string`; **`DataTableSort.key` was bare `string`.**
Compiled against the real tsconfig, this passed with **exit 0**:

```ts
<DataTable<Row> … defaultSort={{ key: "emailAddress", direction: "asc" }} />   // no such key
```

At runtime it is precisely what the acceptance criterion forbids: `compareValues(undefined, undefined)`
returns 0 for every pair so rows keep insertion order, and no column matches `sort.key` so every header
still reports `aria-sort="none"`. **Nothing signals the typo** — rendered and confirmed a silent no-op.

The lesson generalises: the guarantee covered only the props its author thought of. The fix made
`DataTableSort<Row>` generic **and extended the `@ts-expect-error` fixture to cover it**, so the
invariant is now self-checking there too. Re-probed by the coordinator: widening the type back
produces 3 typecheck errors. A full prop audit found no other key typed as `string` (`defaultPage` is a
page number, not a key reference).

### minor — closed in the same pass

- **`null`/`undefined` cells rendered as the literal words** "null"/"undefined" and sorted as those
  words — in a component whose whole purpose is SaaS screens full of `last_login`-shaped columns. Now
  an em dash; `cell` remains the escape hatch.
- **`pageSize={0}` gave `Page 1 / Infinity`** and showed the empty state while rows existed. Clamped.
- **The seventh guard narrower than its own title**: a test named _"imports no components/ui
  primitive"_ asserted only `/(badge|button)/` — importing `Card` left 23/23 green. Widened, and the
  same mutation now fails (re-proved by the coordinator).
- **The copyable snippet showed `<Avatar/name>`** — not valid JSX, referencing a component
  `docs/design-system.md` explicitly says does not exist, inside a gallery whose whole point is
  copy-pastable truth. Elided with the sibling line's `/* … */` convention.
- `defaultPage` was public but undocumented; `localeCompare` had no explicit locale, so server and
  client could disagree on tailored collations — pinned to `"en"` and documented as not locale-aware
  collation.

### acknowledged, not papered over

**The T4 decision (resort → page 1) has no guarding test.** Deleting `setPage(1)` leaves the suite
green. The harness genuinely cannot drive `setState` here — there is no jsdom in this repo and
`components/ui/*` is not importable under Vitest. Rather than invent a test that would pass either way,
the limit is now stated in the test file so the next person knows it is unguarded by choice.

`docs/research/s17-data-table.md` was missing and has been written, recording what live verification
established: the `rowKey` build failure, the keyboard results, and the responsive decision.

## Not verified — needs a human at recette

- **The table by eye**, light and dark: sort a column, page through, and look at the Users block.
- **Sorting with a real locale** — collation is pinned to `"en"`; if a fork sorts French or Swedish
  names, that decision needs revisiting.
- **The em-dash choice** for null cells: it is a judgement call, and yours to overrule.

## Verdict

The implementation was the most rigorously verified of this project — a compile-error proof made
permanent, CDP-driven keyboard checks, five mutation proofs, and a real build failure caught and fixed
(`rowKey` as a callback could not cross the Server→Client boundary; it only fails at production build,
never in dev). The report was accurate everywhere it was checked and under-confident in one place.

What it missed was the thing it was proudest of: the typing invariant it makes its centerpiece leaked
on the one prop its fixture did not cover. That is now closed and self-checking.

Max severity: minor
Ship allowed: yes
