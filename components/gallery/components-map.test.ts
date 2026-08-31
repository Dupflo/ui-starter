import {
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { describe, it, expect, afterEach } from "vitest"

// T2 (s12-ui-gallery) — the load-bearing guarantee of this story.
//
// Exporting the variant tables (T1) makes the gallery DERIVE what it shows —
// but it does nothing to stop a whole new primitive from shipping with no
// gallery section at all. This test closes that gap: it reads
// components/ui/*.tsx directly (source of truth, not a hand-copied list),
// collects every PascalCase component it exports, and fails if COMPONENTS
// (components-map.ts — the map the gallery renders from) has no entry for
// one of them.
//
// SOURCE-LEVEL, NOT A RUNTIME IMPORT: components-map.ts imports real
// components/ui/* modules (Button, LocaleMenu, LocaleSwitcher), which
// transitively import "@/i18n/navigation" → next-intl's createNavigation →
// "next/navigation". That import chain does not resolve under this repo's
// Vitest config (reproduced with a standalone probe importing
// components/ui/button.tsx alone — fails identically, pre-existing and
// unrelated to this story); it is exactly why every other colocated test in
// this repo asserts on source text rather than importing components/ui
// modules (see app/[locale]/page.test.ts, app/[locale]/layout.demo.test.ts).
// This test follows the same convention: it parses components-map.ts's
// source text for the object literal's keys instead of importing it.
//
// Written failing first: components-map.ts started with an empty COMPONENTS
// map (`export const COMPONENTS = {}`), this test went red listing all 15
// missing names, then the map was filled in and the test went green.

const uiDir = fileURLToPath(new URL("../ui/", import.meta.url))
const mapFile = fileURLToPath(new URL("./components-map.ts", import.meta.url))

// Review fix (s12-ui-gallery, minor 3) — three shapes, since regex alone
// cannot see across statements: `export const Name = ` / `export function
// Name(`, `export default function Name(`, and a locally-declared name
// re-exported via `export { Name }` (the `as Alias` form takes the alias,
// matching what an importer actually sees).
const DIRECT_EXPORT_RE =
  /^export (?:default function|function|const) ([A-Z][A-Za-z0-9]*)\b/gm
const NAMED_EXPORT_LIST_RE = /^export \{([^}]+)\}/gm

/** Every PascalCase name a single source file exports, in any of the three forms above. */
function parseExportedNames(source: string): string[] {
  const names = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = DIRECT_EXPORT_RE.exec(source))) names.add(m[1])
  while ((m = NAMED_EXPORT_LIST_RE.exec(source))) {
    for (const entry of m[1].split(",")) {
      const parts = entry.trim().split(/\s+as\s+/)
      const exportedName = parts[parts.length - 1]?.trim()
      if (exportedName && /^[A-Z][A-Za-z0-9]*$/.test(exportedName)) {
        names.add(exportedName)
      }
    }
  }
  return [...names]
}

/** Every `.tsx` file under `dir`, recursively (so `foo/index.tsx` is not evaded). */
function collectTsxFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectTsxFiles(full))
    } else if (entry.name.endsWith(".tsx") && !entry.name.includes(".test.")) {
      files.push(full)
    }
  }
  return files
}

/** Every PascalCase component exported from any `.tsx` file under `dir` (recursive). */
function exportedComponentNames(dir: string): string[] {
  const names = new Set<string>()
  for (const file of collectTsxFiles(dir)) {
    for (const name of parseExportedNames(readFileSync(file, "utf8"))) {
      names.add(name)
    }
  }
  return [...names].sort()
}

/** Keys of the `export const COMPONENTS = { ... }` object literal in components-map.ts. */
function registeredNames(file: string): string[] {
  const source = readFileSync(file, "utf8")
  const body = source.match(/export const COMPONENTS = \{([\s\S]*?)\n\}/)
  if (!body)
    throw new Error("COMPONENTS object literal not found in components-map.ts")
  const keyRe = /^\s*([A-Za-z][A-Za-z0-9]*),?\s*$/gm
  const names: string[] = []
  let m: RegExpExecArray | null
  while ((m = keyRe.exec(body[1]))) names.push(m[1])
  return names.sort()
}

describe("gallery COMPONENTS map — every components/ui export has an entry", () => {
  it("has a COMPONENTS entry for every PascalCase component exported from components/ui/*.tsx", () => {
    const exported = exportedComponentNames(uiDir)
    const registered = new Set(registeredNames(mapFile))
    const missing = exported.filter((n) => !registered.has(n))

    expect(
      missing,
      `components/ui exports with no gallery entry (add to components/gallery/components-map.ts): ${missing.join(", ")}`,
    ).toEqual([])
  })

  it("does not list a component COMPONENTS carries but components/ui no longer exports (stale entry)", () => {
    const exported = new Set(exportedComponentNames(uiDir))
    const stale = registeredNames(mapFile).filter((n) => !exported.has(n))

    expect(
      stale,
      `components-map.ts lists component(s) no longer exported by components/ui: ${stale.join(", ")}`,
    ).toEqual([])
  })
})

// Review fix (s12-ui-gallery, minor 3) — `exportedComponentNames` is this
// story's load-bearing guarantee (see the header comment above), yet its
// own regex only matched `export function X` / `export const X` and its
// `readdirSync` was non-recursive. Probed by the reviewer: `export default
// function X()` and `function X(){}; export { X }` were silently missed,
// and a nested `components/ui/foo/index.tsx` would evade it entirely.
// Nothing was missing at the time, but a false negative here is exactly
// the kind of silent gap this whole story exists to prevent.
//
// These tests prove the widened matcher against real, throwaway files (not
// just regex fixtures) — including the recursive case a flat directory
// scan cannot cover — in a scratch temp directory created and torn down
// per test, so nothing is left on disk or in components/ui.
describe("exportedComponentNames — catches every common export form, including nested files", () => {
  let scratchDir: string | undefined

  afterEach(() => {
    if (scratchDir) rmSync(scratchDir, { recursive: true, force: true })
    scratchDir = undefined
  })

  it("finds `export const`, `export function`, `export default function`, `export { X }`, and files in subdirectories", () => {
    scratchDir = mkdtempSync(path.join(tmpdir(), "gallery-export-probe-"))
    mkdirSync(path.join(scratchDir, "nested"))

    writeFileSync(
      path.join(scratchDir, "named-const.tsx"),
      "export const NamedConst = () => null\n",
    )
    writeFileSync(
      path.join(scratchDir, "named-function.tsx"),
      "export function NamedFunction() { return null }\n",
    )
    writeFileSync(
      path.join(scratchDir, "default-export.tsx"),
      "export default function DefaultExport() { return null }\n",
    )
    writeFileSync(
      path.join(scratchDir, "re-export.tsx"),
      "function ReExported() { return null }\nexport { ReExported }\n",
    )
    writeFileSync(
      path.join(scratchDir, "nested", "index.tsx"),
      "export function NestedComponent() { return null }\n",
    )
    // Ignored the same way top-level test files already are.
    writeFileSync(
      path.join(scratchDir, "named-const.test.tsx"),
      "export const ShouldBeIgnored = () => null\n",
    )

    expect(exportedComponentNames(scratchDir)).toEqual(
      [
        "DefaultExport",
        "NamedConst",
        "NamedFunction",
        "NestedComponent",
        "ReExported",
      ].sort(),
    )
  })
})
