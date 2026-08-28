import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { describe, it, expect } from "vitest"

// docs/theming.md is the re-theme guide handed to anyone forking this
// starter — it must describe the fonts actually loaded, not a face this repo
// dropped for licence reasons (T6/s10-defect-sweep: General Sans → Plus
// Jakarta Sans, see app/fonts/index.test.ts).

const doc = readFileSync(
  path.join(fileURLToPath(new URL(".", import.meta.url)), "theming.md"),
  "utf8",
)

describe("docs/theming.md — s10-defect-sweep F3: no stale General Sans", () => {
  it("does not name General Sans in the font stacks row", () => {
    expect(
      doc,
      'docs/theming.md must not still say "General Sans" — replaced by Plus Jakarta Sans',
    ).not.toMatch(/General Sans/)
  })

  it("names Plus Jakarta Sans in the font stacks row instead", () => {
    expect(
      doc,
      "docs/theming.md should name the font actually loaded (Plus Jakarta Sans)",
    ).toMatch(/Plus Jakarta Sans/)
  })
})
