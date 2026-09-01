/**
 * s15-gallery-feedback (follow-up) — a variant that sets a text colour but
 * supplies no background of its own (`outline`, `ghost` in
 * `components/ui/button.tsx`: `text-paper`/`border-paper/25` with no `bg-*`)
 * is legible only on the ambient surface it was designed for (the dark
 * `pine` chrome). Rendered on any other surface whose background equals
 * that text colour, it disappears — the same defect class as `/pricing`'s
 * wordmark (`text-paper` on `bg-paper`, found in s01's third review) and
 * the five `Logo` call sites re-checked in s10. This is the guard nobody
 * had written despite it being the third occurrence.
 *
 * Read from a Tailwind class string, not a component's rendered DOM — this
 * repo's primitives cannot be runtime-rendered under Vitest (see
 * components-map.test.ts's header), so every gallery guard reads source
 * text; this one reads a class string specifically, so it composes with
 * that convention (see surface-contrast.test.ts's "real button.tsx
 * variants" block, and its use in primitives-section.tsx).
 */

const TOKEN_RE = (prefix: "text" | "bg") =>
  new RegExp(`^${prefix}-([a-z][a-z0-9-]*)(?:/\\d{1,3})?$`)

/** The last (Tailwind/tailwind-merge convention: later wins) bare
 *  `${prefix}-<token>` utility in `classNames`, ignoring anything carrying
 *  a variant prefix (`hover:`, `focus:`, `dark:`…) since those do not
 *  describe the element's resting look. Opacity suffixes (`/80`) are
 *  stripped: `text-paper/80` and `text-paper` are the same token. */
function lastBaseToken(
  classNames: string,
  prefix: "text" | "bg",
): string | undefined {
  const re = TOKEN_RE(prefix)
  let found: string | undefined
  for (const cls of classNames.split(/\s+/)) {
    if (!cls || cls.includes(":")) continue
    const m = re.exec(cls)
    if (m) found = m[1]
  }
  return found
}

export function textToken(classNames: string): string | undefined {
  return lastBaseToken(classNames, "text")
}

export function ownBackgroundToken(classNames: string): string | undefined {
  return lastBaseToken(classNames, "bg")
}

/**
 * True when `classNames` would render invisible against `surfaceBackgroundToken`
 * — the ambient background it is placed on when it does not supply one of
 * its own. A class with no text colour, or one whose effective background
 * (its own `bg-*`, or the ambient surface otherwise) differs from its text
 * colour, is not flagged.
 */
export function isInvisibleOnSurface(
  classNames: string,
  surfaceBackgroundToken: string,
): boolean {
  const text = textToken(classNames)
  if (!text) return false
  const effectiveBackground =
    ownBackgroundToken(classNames) ?? surfaceBackgroundToken
  return text === effectiveBackground
}

/**
 * s15-gallery-feedback (second follow-up) — the one function a gallery
 * call site should reach for instead of inlining
 * `isInvisibleOnSurface(...) ? "<patch>" : undefined` itself: `undefined`
 * when `classNames` reads fine on `surfaceBackgroundToken`, `patchClassName`
 * when it does not. Centralizing it means a call site can be pinned by
 * source-level tests to "calls this shared function" (see
 * button-surface-wiring.test.ts) rather than to the literal variant names
 * it currently happens to patch — a list that goes stale the moment a new
 * variant needs the same treatment (see surface-contrast.test.ts's "Button
 * variants" block for the failure mode this replaced).
 */
export function surfacePatch(
  classNames: string,
  surfaceBackgroundToken: string,
  patchClassName: string,
): string | undefined {
  return isInvisibleOnSurface(classNames, surfaceBackgroundToken)
    ? patchClassName
    : undefined
}
