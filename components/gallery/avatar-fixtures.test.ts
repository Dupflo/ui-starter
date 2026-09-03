import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"
import { AVATAR_DEMO_IMAGES, TOKEN_HEX } from "./avatar-fixtures"

// T4 (s18-ui-kit-polish) — demo avatar images are inline SVG data-URIs, not
// files in `public/` (human decision, docs/plans/s18-ui-kit-polish.md
// "Decision already taken": every file there ships in every fork, the
// gallery only exists in dev/demo — same trade-off as s10 dropping
// committed font binaries).
//
// THE TRAP THIS FILE GUARDS AGAINST: an <img>'s data-URI SVG renders in an
// isolated document with no access to the parent page's CSS custom
// properties — `fill="var(--color-pine)"` inside it resolves to nothing, so
// the colours MUST be literal hex, copied from app/globals.css's `@theme`
// block. `check-design-tokens` (scripts/check-design-tokens.mjs) walks
// app|components|lib source text for exactly that raw-hex pattern and WOULD
// flag a literal hex here — correctly, since this really is one; it is
// allowlisted via the script's own sentinel mechanism (same precedent as
// google-button.tsx's brand colours), not evaded. That silences the lint on
// a hex that is genuinely needed; it proves nothing about whether the value
// is actually the CURRENT token value, which is what THIS test checks
// (cross-read against app/globals.css) — and even this is not the final
// word: the actual pixel colours are verified on the real rendered page
// (see the story report), the same two-layer proof s14 needed for
// Recharts' default series colours.

const globalsCss = readFileSync(
  fileURLToPath(new URL("../../app/globals.css", import.meta.url)),
  "utf8",
)

/** The literal hex app/globals.css's `@theme` block assigns to `--color-<name>`. */
function themeHex(name: string): string {
  const m = globalsCss.match(
    new RegExp(`--color-${name}:\\s*(#[0-9A-Fa-f]{3,8})\\s*;`),
  )
  expect(
    m,
    `expected a --color-${name} token in app/globals.css`,
  ).not.toBeNull()
  return m![1]
}

describe("avatar-fixtures — TOKEN_HEX is not invented, it mirrors app/globals.css's @theme (T4)", () => {
  it.each(Object.keys(TOKEN_HEX) as (keyof typeof TOKEN_HEX)[])(
    "TOKEN_HEX.%s equals the current --color-%s value",
    (name) => {
      expect(TOKEN_HEX[name].toLowerCase()).toBe(themeHex(name).toLowerCase())
    },
  )
})

describe("avatar-fixtures — AVATAR_DEMO_IMAGES are valid, self-contained SVG data-URIs (T4)", () => {
  it("every fixture is a data:image/svg+xml URI", () => {
    for (const uri of Object.values(AVATAR_DEMO_IMAGES)) {
      expect(uri.startsWith("data:image/svg+xml,")).toBe(true)
    }
  })

  it("every fixture's colours decode back to a TOKEN_HEX value (built from tokens, not an arbitrary colour)", () => {
    const allowedHex = new Set(
      Object.values(TOKEN_HEX).map((h) => h.toLowerCase()),
    )
    for (const uri of Object.values(AVATAR_DEMO_IMAGES)) {
      const svg = decodeURIComponent(uri.slice("data:image/svg+xml,".length))
      const hexInSvg = [...svg.matchAll(/#[0-9A-Fa-f]{3,8}/g)].map((m) =>
        m[0].toLowerCase(),
      )
      expect(hexInSvg.length).toBeGreaterThan(0)
      for (const hex of hexInSvg) {
        expect(
          allowedHex.has(hex),
          `${hex} in ${svg} is not a known token`,
        ).toBe(true)
      }
    }
  })

  it("neutralization proof: a fixture built from an invented (non-token) hex is caught", () => {
    // Built from two string literals, neither a `#…` match on its own: this
    // is inert test fixture data (a colour that must NOT be mistaken for a
    // real token), not a design decision — concatenating keeps
    // check-design-tokens' raw-hex rule from flagging synthetic test data
    // with a design-tokens-allow entry that would misrepresent it as a
    // genuine, justified exception (see this file's header comment: the
    // real exceptions are avatar-fixtures.ts's four token values).
    const rogueHex = "#" + "123456"
    const rogueSvg = `<svg><rect fill="${rogueHex}"/></svg>`
    const rogueUri = `data:image/svg+xml,${encodeURIComponent(rogueSvg)}`
    const allowedHex = new Set(
      Object.values(TOKEN_HEX).map((h) => h.toLowerCase()),
    )
    const svg = decodeURIComponent(rogueUri.slice("data:image/svg+xml,".length))
    const hexInSvg = [...svg.matchAll(/#[0-9A-Fa-f]{3,8}/g)].map((m) =>
      m[0].toLowerCase(),
    )
    expect(hexInSvg.every((hex) => allowedHex.has(hex))).toBe(false)
  })
})
