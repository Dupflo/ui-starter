"use client"

import { useId, useMemo, useState, type KeyboardEvent } from "react"
import { cn } from "@/lib/cn"

// T5 (s14-dataviz-and-combobox) — written from scratch: `components/ui/
// select.tsx` wraps a native <select> (no filtering, no free text, no
// listbox) and is not a base for this. No dependency was added — a
// combobox package would require its own ADR (docs/decisions/006 covers
// charts only).
//
// Accessibility is the point, not polish: an accessible name from a real
// <label htmlFor={inputId}> (never the optional `placeholder` — review
// finding, s14-dataviz-and-combobox: a bare <span> next to the input,
// or an aria-label on the popup instead of the control, both leave the
// input nameless), role="combobox" on the input, aria-expanded /
// aria-controls / aria-activedescendant, a role="listbox" popup with
// role="option" children (including the empty-result state — a listbox's
// only valid children are option/group, never a bare text node), ↑ ↓
// Enter Escape Home End, focus never leaves the input (options are
// selected via aria-activedescendant, never DOM focus — clicking an
// option uses onMouseDown+preventDefault so the input never blurs), and
// an aria-live region announcing the filtered result count. Proven on
// the DOM actually served — see the story report; Vitest cannot exercise
// real keyboard events here (no jsdom/happy-dom in this repo, see
// components-map.test.ts's header) so combobox.test.ts only pins the
// ARIA surface's presence in source.

export type ComboboxOption = { value: string; label: string }

export function Combobox({
  id,
  label,
  options,
  placeholder,
  disabled = false,
  emptyLabel,
  /** i18n template with a literal "{count}" placeholder, interpolated here
   *  (same convention as the gallery's modalTriggerFor — see
   *  primitives-section.tsx's PrimitivesLabels doc comment). */
  resultsLabel,
  defaultQuery = "",
  defaultOpen = false,
  onSelect,
}: {
  id?: string
  label?: string
  options: ComboboxOption[]
  placeholder?: string
  disabled?: boolean
  emptyLabel: string
  resultsLabel: string
  defaultQuery?: string
  defaultOpen?: boolean
  onSelect?: (option: ComboboxOption) => void
}) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const listboxId = `${inputId}-listbox`
  const optionId = (index: number) => `${inputId}-option-${index}`

  const [query, setQuery] = useState(defaultQuery)
  const [open, setOpen] = useState(defaultOpen)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  const clampedHighlight =
    filtered.length === 0 ? -1 : Math.min(highlightedIndex, filtered.length - 1)

  function selectOption(option: ComboboxOption) {
    setQuery(option.label)
    setOpen(false)
    setHighlightedIndex(0)
    onSelect?.(option)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault()
        if (!open) {
          setOpen(true)
          setHighlightedIndex(0)
          return
        }
        if (filtered.length === 0) return
        setHighlightedIndex((i) => (i + 1) % filtered.length)
        return
      }
      case "ArrowUp": {
        e.preventDefault()
        if (!open) {
          setOpen(true)
          setHighlightedIndex(filtered.length - 1)
          return
        }
        if (filtered.length === 0) return
        setHighlightedIndex((i) => (i - 1 + filtered.length) % filtered.length)
        return
      }
      case "Home": {
        if (!open) return
        e.preventDefault()
        setHighlightedIndex(0)
        return
      }
      case "End": {
        if (!open) return
        e.preventDefault()
        setHighlightedIndex(filtered.length - 1)
        return
      }
      case "Enter": {
        if (!open) return
        e.preventDefault()
        const chosen = filtered[clampedHighlight]
        if (chosen) selectOption(chosen)
        return
      }
      case "Escape": {
        if (!open) return
        e.preventDefault()
        setOpen(false)
        return
      }
      default:
        return
    }
  }

  const resultsAnnouncement = resultsLabel.replace(
    "{count}",
    String(filtered.length),
  )

  return (
    <div className="relative">
      {label ? (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-xs font-medium text-muted"
        >
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && clampedHighlight >= 0 ? optionId(clampedHighlight) : undefined
        }
        disabled={disabled}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setHighlightedIndex(0)
        }}
        onFocus={() => {
          if (!disabled) setOpen(true)
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full rounded-lg border border-line bg-input px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-pine focus:ring-[3px] focus:ring-pine/10 disabled:opacity-60",
        )}
      />
      <span className="sr-only" aria-live="polite">
        {open ? resultsAnnouncement : ""}
      </span>
      {open && !disabled ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={label}
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-line bg-input py-1 shadow-float"
        >
          {filtered.length > 0 ? (
            filtered.map((option, i) => (
              <li
                key={option.value}
                id={optionId(i)}
                role="option"
                aria-selected={i === clampedHighlight}
                onMouseDown={(e) => {
                  // Keep focus in the input — selecting an option must never
                  // move DOM focus into the popup.
                  e.preventDefault()
                }}
                onClick={() => selectOption(option)}
                className={cn(
                  "cursor-pointer px-3 py-2 text-sm text-ink",
                  i === clampedHighlight ? "bg-fill" : "hover:bg-fill",
                )}
              >
                {option.label}
              </li>
            ))
          ) : (
            // A listbox's only valid children are option/group — no bare
            // text node (WAI-ARIA APG). `aria-disabled` marks it
            // non-interactive; there is nothing to select, hence
            // `aria-selected={false}` (also required — role="option"
            // always needs it, jsx-a11y/role-has-required-aria-props).
            <li
              role="option"
              aria-disabled="true"
              aria-selected={false}
              className="cursor-default px-3 py-2 text-sm text-muted"
            >
              {emptyLabel}
            </li>
          )}
        </ul>
      ) : null}
    </div>
  )
}
