"use client"

import { createPortal } from "react-dom"
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react"
import { cn } from "@/lib/cn"

// T1 (s19-action-menu) — components/ui/locale-menu.tsx is the repo's
// existing dropdown: useState(open), aria-expanded/aria-haspopup, a
// document-level mousedown listener closing on outside click. REUSED: that
// exact shape (open state, aria-expanded/aria-haspopup on the trigger,
// role="menu" on the popup, outside-click via a document mousedown
// listener). NOT reused, deliberately: LocaleMenu renders its popup in
// normal flow (`position: absolute` inside the trigger's own `relative`
// wrapper) — correct for a header with no clipping ancestor, but wrong here
// (T4, below). LocaleMenu also never moves real DOM focus into its items
// (no ↑ ↓ Home End, nothing returns focus to the trigger on close) — the
// story's AC requires exactly that, so it is written from scratch here
// rather than generalising LocaleMenu, per T1's own instruction.
//
// Scope (docs/stories.md AC): a FLAT action list. No submenus, no displayed
// shortcuts, no separated groups.
export type ActionMenuItem = {
  key: string
  label: string
  onSelect?: () => void
  /** Rendered distinctly (danger colour) — does not otherwise change
   *  keyboard behaviour. */
  destructive?: boolean
  /** Stays focusable (never the native `disabled` attribute, which would
   *  remove it from the roving-focus sequence entirely — WAI-ARIA APG
   *  menu items remain perceivable via keyboard even when inert) but never
   *  fires `onSelect` and never closes the menu on activation. */
  disabled?: boolean
}

export function ActionMenu({
  /** Real accessible name for the trigger — required, never
   *  optional-with-a-fallback: s14 shipped a control whose name silently
   *  came from an optional `placeholder`, so it had none when that prop was
   *  absent (docs/reviews/s14-dataviz-and-combobox.md, major finding).
   *  Also used as the open menu's own `aria-label` (role="menu" needs an
   *  accessible name too, same convention as Combobox's listbox). */
  label,
  items,
  className,
}: {
  label: string
  items: ActionMenuItem[]
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  // Which item gets focus once the menu opens: 0 for every open EXCEPT
  // ArrowUp on the trigger, which opens at the LAST item (WAI-ARIA APG menu
  // button pattern). A ref, not state — it is read exactly once, by the
  // "focus on open" effect below, and never drives a render itself.
  const openFocusIndexRef = useRef(0)

  function openMenu(focusIndex: number) {
    openFocusIndexRef.current = focusIndex
    setOpen(true)
  }

  function closeAndReturnFocus() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  // T3 — move REAL DOM focus into the menu on open. Unlike Combobox's
  // role="option" list (focus stays in the input; the highlighted option is
  // only ever `aria-activedescendant`), ActionMenu's items are individually
  // focusable `<button>`s: real focus is both correct (WAI-ARIA APG menu
  // pattern) and simpler than reimplementing activedescendant tracking for
  // a flat list.
  useEffect(() => {
    if (!open) return
    itemRefs.current[openFocusIndexRef.current]?.focus()
  }, [open])

  // T4 — position the portaled menu from the trigger's OWN geometry, every
  // time it opens. Direct DOM mutation, not React state: a `setState` call
  // in an effect BODY (not inside a listener callback) is flagged by
  // react-hooks/set-state-in-effect (see components/ui/modal.tsx for the
  // one place in this repo that already pays that warning) — reading
  // layout and writing `style` is not React state, so this effect adds
  // none of that cost.
  //
  // Fix mode (review, MAJOR 2) — the ORIGINAL version anchored only the
  // RIGHT edge (`right = window.innerWidth - rect.right`, reasoning: the
  // trigger sits at the END of a table row, `align: "end"`) and never
  // checked where that left the LEFT edge. Measured on this repo's own
  // ActionMenu primitive demo: -95px at 390/640, -87px at 768/1024 — the
  // menu's own text ("Modifier" etc.) rendered cut off past the left
  // edge of the viewport. `getBoundingClientRect().width` (the menu is
  // already mounted in the DOM by the time this effect runs, so its real
  // rendered width — not a guess — is available) plus a `Math.min(Math.max(
  // …))` clamp keeps BOTH edges inside `[MARGIN, innerWidth - MARGIN]`,
  // still preferring the right-aligned position when it fits.
  //
  // Fix mode (review, MAJOR 1) — dark mode never reached the menu: `.dark`
  // in this repo is a class on the app-shell wrapper (app/globals.css),
  // never on `<html>`, and the portal lands on `document.body`, outside
  // that subtree — `components/app/mobile-sidebar.tsx` hit the mirror
  // image of this problem (needing to force LIGHT regardless of an
  // ancestor `.dark`) and fixed it with a class on the portaled element
  // itself (`light-scope`); this menu needs the opposite treatment —
  // inheriting whatever the trigger's own ancestry says — so it reads
  // `trigger.closest(".dark")` (not a `useDarkMode()` hook: `ActionMenu`
  // is a bare `components/ui` primitive, usable outside `AppShell` too,
  // where no `.dark` ancestor ever exists) and toggles that same `dark`
  // class directly on the menu element — a plain class selector in
  // `app/globals.css`, so it applies wherever the class lands, portal or
  // not.
  useEffect(() => {
    if (!open) return
    const trigger = triggerRef.current
    const menu = menuRef.current
    if (!trigger || !menu) return
    const rect = trigger.getBoundingClientRect()
    menu.style.top = `${rect.bottom + 4}px`

    const MARGIN = 8
    const menuWidth = menu.getBoundingClientRect().width
    const idealLeft = rect.right - menuWidth
    const left = Math.min(
      Math.max(idealLeft, MARGIN),
      window.innerWidth - menuWidth - MARGIN,
    )
    menu.style.left = `${left}px`

    menu.classList.toggle("dark", trigger.closest(".dark") !== null)
  }, [open])

  // Outside click closes (AC) — reused shape from LocaleMenu (T1), widened:
  // the portaled menu (T4) is NOT a descendant of `containerRef` (it lives
  // in `document.body`), so a click inside it must be exempted too, or
  // every click on an item would register as "outside" and race the item's
  // own `onClick`.
  useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        containerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [open])

  // T4 (continued) — a `fixed`-positioned menu computed once, on open, from
  // `getBoundingClientRect()` visually detaches from its trigger the moment
  // any ancestor scrolls (DataTable's own `overflow-x-auto` chief among
  // them). Re-tracking on every scroll frame is a floating-UI engine, out
  // of this story's scope (a flat action list). Closing instead is the
  // honest alternative: never silently wrong, just gone — same kind of
  // explicit, documented trade-off as DataTable's own T4 decision (resort →
  // page 1). `capture: true`: a scrollable ancestor's `scroll` event does
  // not bubble to `window`, only capture.
  //
  // Fix mode (review, MAJOR 3) — `setOpen(false)` alone (the original code)
  // leaves DOM focus wherever it already was: with focus on a menuitem
  // (roving focus, T3) and the menu removed from the tree by the next
  // render, `document.activeElement` fell back to `<body>` — reproduced by
  // opening with ArrowDown then `window.scrollBy(0, 60)`. Outside click
  // deliberately does NOT return focus (see the mousedown effect above —
  // the click itself already moved focus somewhere real), but a scroll or
  // resize moves nothing: `closeAndReturnFocus()` is the correct close here,
  // same call Escape and activation already use.
  //
  // NOT handled here, by choice: this repo's global `scroll-behavior:
  // smooth` (app/globals.css) means opening the menu while an unrelated
  // smooth scroll is still animating fires this listener ~12ms later,
  // closing the menu almost as soon as it appeared. Debouncing or delaying
  // listener registration would dodge that narrow race at the cost of
  // silently *not* closing during a real fast manual scroll for that same
  // window — a worse trade for a rarer bug. Left as a known, accepted
  // edge case rather than fixed.
  useEffect(() => {
    if (!open) return
    const onViewportChange = () => closeAndReturnFocus()
    window.addEventListener("scroll", onViewportChange, true)
    window.addEventListener("resize", onViewportChange)
    return () => {
      window.removeEventListener("scroll", onViewportChange, true)
      window.removeEventListener("resize", onViewportChange)
    }
  }, [open])

  // Fix mode (review, MINOR 3) — `LocaleMenu` (components/ui/locale-menu.tsx,
  // T1's own precedent) closes on a DOCUMENT-level Escape keydown; this
  // component only handled Escape inside `handleItemKeyDown`, scoped to
  // whichever item currently has focus — if focus ever left the menu
  // without closing it first, Escape stopped doing anything. Document-level
  // Escape is a strict superset (it fires regardless of where focus is)
  // rather than a replacement for the per-item Escape below, so both agree
  // in the common case and this one covers the gap.
  useEffect(() => {
    if (!open) return
    // `globalThis.KeyboardEvent`, not the bare `KeyboardEvent` this file
    // imports from React (that one is React's synthetic event type,
    // parameterised on a target element — wrong shape for a raw
    // `document.addEventListener` callback, which gets the DOM event).
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") closeAndReturnFocus()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open])

  function handleTriggerClick() {
    if (open) {
      setOpen(false)
      return
    }
    openMenu(0)
  }

  function handleTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      openMenu(0)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      openMenu(items.length - 1)
    }
  }

  function handleSelect(item: ActionMenuItem) {
    if (item.disabled) return
    item.onSelect?.()
    closeAndReturnFocus()
  }

  function handleItemKeyDown(
    e: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        itemRefs.current[(index + 1) % items.length]?.focus()
        return
      case "ArrowUp":
        e.preventDefault()
        itemRefs.current[(index - 1 + items.length) % items.length]?.focus()
        return
      case "Home":
        e.preventDefault()
        itemRefs.current[0]?.focus()
        return
      case "End":
        e.preventDefault()
        itemRefs.current[items.length - 1]?.focus()
        return
      case "Escape":
        e.preventDefault()
        closeAndReturnFocus()
        return
      case "Tab":
        // Fix mode (review, MINOR 4) — Tab moves focus OUT of the menu via
        // the browser's own native tab order; leaving the menu open here
        // strands it, visible but disconnected from focus (reproduced: Tab
        // from a menuitem landed on an unrelated <select> elsewhere on the
        // page — portal DOM order, not visual order). WAI-ARIA APG's fuller
        // answer — close AND move focus to whatever would follow the
        // TRIGGER in tab order — needs computing tab order across the
        // portal boundary, a floating-UI-engine-shaped problem out of a
        // flat action list's scope (same class of decision as the
        // scroll-close effect above). `setOpen(false)`, not
        // `closeAndReturnFocus()` and no `preventDefault()`: the browser's
        // own Tab destination is left alone, only the now-stranded menu is
        // closed.
        setOpen(false)
        return
      default:
        return
    }
  }

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-fill hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/60"
      >
        {/* Vertical-dots (kebab) glyph — the trigger's only visible
            content, decorative: the real accessible name is `aria-label`
            above, never this icon. */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="8" cy="3" r="1.3" />
          <circle cx="8" cy="8" r="1.3" />
          <circle cx="8" cy="13" r="1.3" />
        </svg>
      </button>

      {/* T4 — `document` cannot exist during SSR (Next server-renders
          "use client" components too) and `open` never starts `true`
          server-side or on the FIRST client render (no `defaultOpen` prop,
          `useState(false)` — matching, no hydration mismatch): `open` can
          only become `true` from a browser event handler, so `document`
          is always defined by the time this branch is reached. The guard
          is a defensive belt, not load-bearing. */}
      {open && typeof document !== "undefined"
        ? createPortal(
            <ul
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={label}
              style={{ position: "fixed" }}
              className="z-50 min-w-44 overflow-hidden rounded-xl border border-line bg-paper py-1.5 shadow-float"
            >
              {items.map((item, i) => (
                <li key={item.key} role="none">
                  <button
                    ref={(el) => {
                      itemRefs.current[i] = el
                    }}
                    type="button"
                    role="menuitem"
                    aria-disabled={item.disabled || undefined}
                    tabIndex={-1}
                    onClick={() => handleSelect(item)}
                    onKeyDown={(e) => handleItemKeyDown(e, i)}
                    className={cn(
                      "flex w-full items-center px-3.5 py-2 text-left text-sm transition-colors",
                      item.disabled
                        ? "cursor-not-allowed text-muted/50"
                        : item.destructive
                          ? "text-danger hover:bg-danger/10"
                          : "text-ink hover:bg-fill",
                    )}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </div>
  )
}
