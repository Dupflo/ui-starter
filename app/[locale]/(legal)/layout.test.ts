import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { describe, it, expect } from "vitest"

// Source-level structural assertions for the legal pages layout.
//
// WHY source-level: the repo runs vitest with `environment: node` (no jsdom).
// The established convention is source inspection (see page.test.ts,
// app-sidebar.test.ts, auth-shell.test.ts).
//
// s10-defect-sweep F1: printing a legal page should give the legal text, not
// the chrome. The bg-pine header's text-paper wordmark/link print invisible
// (browsers drop descendant background-color when Background graphics is
// off), and the bottom link list is navigation, not the legal text itself —
// both are hidden on print via `.print-hide` (app/globals.css).

const layoutSource = readFileSync(
  path.join(fileURLToPath(new URL(".", import.meta.url)), "layout.tsx"),
  "utf8",
)

describe("legal layout — s10-defect-sweep F1: chrome hidden on print", () => {
  it("bg-pine header carries print-hide", () => {
    expect(
      layoutSource,
      'layout.tsx <header className="bg-pine"> must also carry "print-hide" — its text-paper wordmark and "back home" link print invisible otherwise',
    ).toMatch(/<header className="bg-pine print-hide">/)
  })

  it("bottom legal-pages nav carries print-hide", () => {
    expect(
      layoutSource,
      "layout.tsx bottom <nav> (mentions légales / cgv / confidentialité / cookies links) must carry print-hide — printing a legal page should give the legal text, not the site navigation",
    ).toMatch(/<nav\s+className="mx-auto mt-16[^"]*\bprint-hide\b[^"]*">/)
  })
})
