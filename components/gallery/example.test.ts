import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// T1 (s13-gallery-ergonomics) — `Example` must delegate its code footer to
// `CodeDisclosure` (the collapsible wrapper) instead of rendering the
// `<pre><code>`/`CopyButton` pair inline. Keeping this delegation explicit
// also pins the client boundary: `CodeDisclosure` should be the only client
// import `example.tsx` needs for its footer — `CopyButton` moves inside it.
//
// SOURCE-LEVEL — see code-disclosure.test.ts's header for why (Button's
// `@/i18n/navigation` import chain is unresolvable under this repo's Vitest
// config, so example.tsx cannot be runtime-rendered here either).

const source = readFileSync(
  fileURLToPath(new URL("./example.tsx", import.meta.url)),
  "utf8",
)

describe("Example — delegates its code footer to CodeDisclosure (s13-gallery-ergonomics)", () => {
  it("imports CodeDisclosure", () => {
    expect(source).toMatch(
      /import\s*\{\s*CodeDisclosure\s*\}\s*from\s*["']@\/components\/gallery\/code-disclosure["']/,
    )
  })

  it("renders <CodeDisclosure code={code} labels={labels} />", () => {
    expect(source).toMatch(
      /<CodeDisclosure\s+code=\{code\}\s+labels=\{labels\}/,
    )
  })

  it("no longer imports CopyButton directly (moved inside CodeDisclosure)", () => {
    expect(source).not.toMatch(
      /from ["']@\/components\/gallery\/copy-button["']/,
    )
  })
})
