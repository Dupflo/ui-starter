import { readdirSync, readFileSync, statSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { describe, it, expect } from "vitest"

// T2 (s14-dataviz-and-combobox) — ADR 006's whole point: Recharts is
// reversible only if nothing outside components/ui/chart-*.tsx ever
// imports it directly. This test is the mechanical version of the plan's
// `git grep -l 'from "recharts"' -- app components | grep -v
// "components/ui/chart-"` check — implemented as a filesystem walk (not a
// shelled-out `git grep`) so it runs the same way in CI as it does here and
// does not depend on git being on PATH or the files being tracked yet.
//
// Review finding (minor) — the original regex only caught the quoted
// static-import form and missed three realistic evasions: a subpath import
// (`from "recharts/es6/chart/LineChart"`, a normal tree-shaking idiom),
// `require("recharts")`, and `await import("recharts")` (the idiomatic
// `next/dynamic(() => import("recharts"))` for a charting library).
// `ROOTS` also omitted `lib`. Both are fixed below. Each of the four forms
// (the original quoted static import, the three evasions) was proven to
// flip this test red with a throwaway file under `app/`, then removed —
// not kept in this file as a permanent fixture, since that would itself be
// a stray recharts import for every other guard in this repo to trip on.
//
// Written failing first: proven red against a scratch stray import, green
// again once it was removed — same process repeated for the widened regex
// above.

const ROOTS = ["app", "components", "lib"]
const EXT = /\.(tsx?|jsx?)$/
const RECHARTS_IMPORT_RE =
  /(?:\bfrom\s+["']recharts(?:\/[^"']*)?["'])|(?:\brequire\(\s*["']recharts(?:\/[^"']*)?["']\s*\))|(?:\bimport\(\s*["']recharts(?:\/[^"']*)?["']\s*\))/

function repoRoot(dir: string) {
  // components/ui/ -> repo root is two levels up.
  return fileURLToPath(new URL(dir, import.meta.url))
}

function collectFiles(dir: string): string[] {
  const files: string[] = []
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return files
  }
  for (const name of entries) {
    const full = path.join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue
      files.push(...collectFiles(full))
    } else if (EXT.test(name) && !name.includes(".test.")) {
      // Test files (like this one) are excluded: the ADR's concern is
      // screens/pages/gallery components importing recharts, not this
      // guard's own source, which necessarily spells out the forbidden
      // import string in its doc comment and regex literal.
      files.push(full)
    }
  }
  return files
}

/** Every file under `app|components` importing from "recharts", relative to repo root. */
function filesImportingRecharts(): string[] {
  const root = repoRoot("../../")
  const violations: string[] = []
  for (const dir of ROOTS) {
    for (const file of collectFiles(path.join(root, dir))) {
      const source = readFileSync(file, "utf8")
      if (RECHARTS_IMPORT_RE.test(source)) {
        violations.push(path.relative(root, file))
      }
    }
  }
  return violations
}

describe("ADR 006 encapsulation — no screen/page/gallery file imports recharts directly", () => {
  it("only components/ui/chart-*.tsx files import from recharts", () => {
    const offenders = filesImportingRecharts().filter(
      (f) => !/^components[\\/]ui[\\/]chart-.*\.tsx$/.test(f),
    )

    expect(
      offenders,
      `these files import "recharts" directly, breaking ADR 006's encapsulation (only components/ui/chart-*.tsx may): ${offenders.join(", ")}`,
    ).toEqual([])
  })
})
