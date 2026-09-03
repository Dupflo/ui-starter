# Review — Story s19-action-menu

> Fresh-context reviewer subagent. Diff judged: `git diff origin/main...feature/s19-action-menu`.
> Closes the last of four visual annotations. Adds an interactive primitive whose entire value is
> keyboard and focus behaviour — so it was driven in a real browser over CDP, not reasoned about.

## The environment claim that was false, and what it cost

The implementation report stated that headless Chrome could not complete any network request here, and
substituted jsdom + real React reconciliation of the unmodified sources. The substitute was genuine
work, honestly labelled — **but the premise does not hold.** The coordinator verified Chrome before
dispatching this review (168 KB DOM, exit 0, all five triggers present), and the reviewer drove full
CDP sessions without difficulty: page loads, hydration, `Input.dispatchKeyEvent`,
`Accessibility.getFullAXTree`, `Page.captureScreenshot`.

The verification T3 and T4 explicitly mandate was therefore skipped on a false premise, and it cost
**three defects that jsdom structurally cannot see**. The lesson: when a tool appears broken, the
possibility that the tool is fine and the invocation is wrong deserves one more attempt before
substituting something weaker.

## What the browser confirmed as correct

- **AX tree**: trigger `role=button`, `name="Actions pour Camille Girard"`, `nameFrom=attribute`,
  `hasPopup="menu"`, `expanded=true`, `controls` resolving to a real element. Open menu: `role=menu`
  with three `menuitem` children, `focused: true` on the first. `label: string` is **required**, so
  s14's optional-placeholder failure mode is structurally impossible.
- **Keyboard**: ArrowDown opens and moves real DOM focus; ArrowUp on the trigger opens at the last
  item; both wrap; Home/End land correctly; the disabled item is focusable but neither activates nor
  closes.
- **Enter and Space do activate** — the implementer's caveat was refuted. It was a jsdom artifact.
- **Escape closes and returns focus**; outside click closes.
- **The portal escapes the table**: `scroller.contains(menu) === false`, the menu overlaying the
  pagination row and extending 110px past the table's bottom edge. T4 genuinely solved.

## Findings

### major — the portaled menu did not follow dark mode

`.dark` in this repo is a class on a wrapper `<div>`, never on `<html>` (`globals.css:72`,
`app-shell.tsx:65`, `theme-toggle.tsx:27`). The portal lands on `document.body`, **outside that
subtree**, so the menu resolved the light palette: `menu.closest('.dark') === null`, background
`rgb(249,249,251)` while the card behind it was `rgb(26,29,46)` — a white popup on a dark page.

**This repo had already solved it once**: `mobile-sidebar.tsx:55`, the only other `createPortal` usage,
puts `light-scope` on its portaled drawer for exactly this reason. T1 asked for `locale-menu.tsx` to be
read; the actual portal precedent was one file away.

Fixed by reading `trigger.closest(".dark")` and mirroring the class onto the portaled list.
Re-verified by the coordinator in a real browser: `classList.contains("dark") === true`, background
`rgb(26,29,46)` — the dark token.

### major — no left-edge clamp; the demo rendered half off-screen

Positioning anchored only the right edge. The comment claimed this "keeps it from ever running off the
right side of the viewport" — true, and it silently traded that for the left. Measured `left` on the
ActionMenu demo: **−95px at 390 and 640, −87px at 768 and 1024**, correct only at 1440. The screenshot
showed "Modifier / Archiver / Supprimer" cut to "odifier / rchiver / upprimer".

Both edges are now clamped into `[8, innerWidth − 8]`. Re-measured by the coordinator across all five
widths: **8, 8, 8, 8, 57** — never negative.

### major — closing on scroll dropped focus onto `<body>`

`onViewportChange` called a bare `setOpen(false)` while `closeAndReturnFocus()` existed and was used
for Escape and activation. Reproduced: open with ArrowDown, `window.scrollBy(0, 60)` → menu closed,
`document.activeElement === BODY`. On a story whose AC says focus returns to the trigger and that a
mouse-only menu is a defect, losing the keyboard user's position on a wheel scroll is real. Fixed;
proven to return focus to the trigger.

The related smooth-scroll race (opening while a `scroll-behavior: smooth` animation is in flight makes
the menu appear and vanish ~12ms later) is documented as a deliberate non-fix rather than silently
left.

### minor — three of the new guards did not guard

Proven by mutation, each leaving 15/15 green: removing the `if (item.disabled) return` from
`handleSelect` (disabled items become activatable — a stated AC); making `Home` focus the _last_ item;
and making `label` optional with an `"Actions"` default — **the literal s14 regression**, in a test
_named_ for the s14 lesson, which passes `label` explicitly and so can never observe the fallback.

In fairness, unlike s18's failure mode these assertions read the same file that runs — they are honest,
just blind to behaviour. All three re-armed.

### minor — also closed

Hardcoded English in the FR-served snippet (``label={`Actions for ${row.name}`}``) in the file whose
job is copy-pastable truth; Escape handled only per-item, so dead if focus left the menu without
closing it; and Tab leaving the menu open while moving focus elsewhere in the portal's DOM order.

## A note on measurement

The coordinator filed **three** false readings while verifying this branch and caught each before
reporting: `grep -c` counting lines of minified HTML (under-reporting 5 triggers as 2), a CDP probe
querying the portal in the same expression as the click (before React had rendered it), and earlier in
s18 two probes that mutated a display string instead of the live config. Every one looked like a defect
in the code. The habit that caught them: when a probe says something surprising, check the probe first.

## Not verified — needs a human at recette

- **The menu by eye**, light and dark, on the DataTable's last row and at a narrow width.
- **Whether closing on scroll is the right behaviour** for a starter primitive, versus re-tracking.
- **Tab's destination** after the menu closes — it follows the portal's DOM order, not the trigger's.

## Verdict

The hardest and most explicitly specified part — accessible name, roving focus, Enter/Space, Escape
with focus return, outside click, and escaping the table's `overflow-x-auto` — is genuinely correct and
was verified clause by clause in a real browser and in the AX tree. What failed was what the skipped
browser pass would have caught in five minutes, and all of it is now fixed and re-measured.

Max severity: minor
Ship allowed: yes
