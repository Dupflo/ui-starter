import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"
import {
  textToken,
  ownBackgroundToken,
  isInvisibleOnSurface,
  surfacePatch,
} from "./surface-contrast"

// s15-gallery-feedback (follow-up) — this is the THIRD occurrence of the
// same defect class: /pricing's wordmark was `text-paper` on `bg-paper`
// (s01's third review), the same trap was checked across all five `Logo`
// call sites in s10, and Button's `outline`/`ghost` variants (`text-paper`,
// no background of their own) rendered invisible on the gallery's
// `bg-paper` preview card. Nobody had written the guard. This is it.

describe("textToken / ownBackgroundToken — read a class string's resting-state colour tokens", () => {
  it("extracts a bare text-* token", () => {
    expect(textToken("text-paper")).toBe("paper")
  })

  it("strips an opacity suffix", () => {
    expect(textToken("text-paper/80")).toBe("paper")
  })

  it("ignores hover:/focus:-prefixed tokens — not the resting look", () => {
    expect(textToken("text-ink hover:text-paper")).toBe("ink")
  })

  it("returns undefined when there is no text-* token", () => {
    expect(textToken("bg-pine font-semibold")).toBeUndefined()
  })

  it("extracts a bare bg-* token, last one wins", () => {
    expect(ownBackgroundToken("bg-pine bg-pine-900")).toBe("pine-900")
  })

  it("ignores hover:-prefixed backgrounds", () => {
    expect(
      ownBackgroundToken("border-paper/25 hover:bg-paper/5"),
    ).toBeUndefined()
  })
})

describe("isInvisibleOnSurface — flags text colour == effective background colour", () => {
  it("flags a text-only class (no own background) matching the ambient surface", () => {
    expect(isInvisibleOnSurface("text-paper", "paper")).toBe(true)
  })

  it("does not flag when the class supplies its own, different background", () => {
    expect(isInvisibleOnSurface("bg-pine text-paper", "paper")).toBe(false)
  })

  it("does not flag when the text colour differs from the ambient surface", () => {
    expect(isInvisibleOnSurface("text-ink", "paper")).toBe(false)
  })

  it("does not flag a class with no text colour at all", () => {
    expect(isInvisibleOnSurface("border border-line", "paper")).toBe(false)
  })

  it("flags even when the own background equals the text colour (still invisible)", () => {
    expect(isInvisibleOnSurface("bg-paper text-paper", "sand")).toBe(true)
  })
})

// ─── real button.tsx variants, parsed source-level ─────────────────────────
// Importing components/ui/button.tsx fails under this repo's Vitest config
// (it imports @/i18n/navigation — see components-map.test.ts's header for
// the full explanation), so this reads the source text, the same
// convention every other gallery guard in this project follows.

const buttonSource = readFileSync(
  fileURLToPath(new URL("../ui/button.tsx", import.meta.url)),
  "utf8",
)

function parseButtonVariants(source: string): Record<string, string> {
  const body = source.match(
    /export const variants: Record<Variant, string> = \{([\s\S]*?)\n\}/,
  )
  if (!body) throw new Error("variants object literal not found in button.tsx")
  const entryRe = /^\s*(\w+):\s*"([^"]*)"/gm
  const out: Record<string, string> = {}
  let m: RegExpExecArray | null
  while ((m = entryRe.exec(body[1]))) out[m[1]] = m[2]
  return out
}

describe("Button variants — none render invisible on the gallery's default (paper) preview surface", () => {
  const variants = parseButtonVariants(buttonSource)

  it("parsed at least the variants this test's reasoning depends on", () => {
    expect(Object.keys(variants)).toEqual(
      expect.arrayContaining([
        "primary",
        "pine",
        "outline",
        "ghost",
        "subtle",
        "danger",
      ]),
    )
  })

  // s15-gallery-feedback (second follow-up) — this USED to assert
  // `toEqual(["ghost", "outline"])`: a hardcoded list of today's invisible
  // variants. That is the wrong invariant. It made the test fail the moment
  // a reviewer added a THIRD invisible variant that the gallery already
  // patched correctly — its only "fix" would have been editing the list,
  // which trains the exact reflex ("make the assertion match today's
  // output") that has bitten this project repeatedly. The real invariant
  // is behavioural: every variant the derivation flags gets the gallery's
  // patch, and none that it doesn't flag gets one — for ANY variant table,
  // not today's specific names. `surfacePatch` (surface-contrast.ts) is the
  // exact function `primitives-section.tsx`'s Button group calls to compute
  // `previewClassName` (pinned by button-surface-wiring.test.ts's "calls
  // surfacePatch" check below) — so this is not re-deriving the answer from
  // the same predicate in isolation, it is checking the one function the
  // gallery actually uses.
  it("gives every variant flagged by isInvisibleOnSurface the gallery's patch, and no other variant one", () => {
    for (const [name, classes] of Object.entries(variants)) {
      const patch = surfacePatch(classes, "paper", "bg-pine")
      if (isInvisibleOnSurface(classes, "paper")) {
        expect(patch, `${name} is invisible on paper, expected a patch`).toBe(
          "bg-pine",
        )
      } else {
        expect(
          patch,
          `${name} is not invisible on paper, expected no patch`,
        ).toBeUndefined()
      }
    }
  })

  it("does not flag pine/danger — they carry their own background, so the ambient surface never applies", () => {
    expect(isInvisibleOnSurface(variants.pine, "paper")).toBe(false)
    expect(isInvisibleOnSurface(variants.danger, "paper")).toBe(false)
  })

  // Direction 1 of the two-direction proof: a brand-new invisible variant
  // — one this table has never seen — is handled automatically, with
  // nothing in this test edited to name it.
  it("a brand-new invisible variant (not in button.tsx today) is patched automatically — no list to edit", () => {
    const withProbe = { ...variants, probeInvisible: "text-paper" }
    expect(isInvisibleOnSurface(withProbe.probeInvisible, "paper")).toBe(true)
    expect(surfacePatch(withProbe.probeInvisible, "paper", "bg-pine")).toBe(
      "bg-pine",
    )
  })
})
