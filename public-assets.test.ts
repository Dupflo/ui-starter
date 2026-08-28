import { readdirSync, statSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { describe, it, expect } from "vitest"

// s10-defect-sweep — `public/` is served verbatim at the site root by Next:
// anything under it is downloadable as-is (e.g. a stray *.test.ts becomes
// https://<site>/favicon.test.ts, shipped in every fork of this starter).
// This is a recurrence: an earlier audit on this repo already found and fixed
// the same bug once. Guard against it coming back — `public/` may only ever
// contain static assets, never source or test files.

const publicDir = fileURLToPath(new URL("./public", import.meta.url))

const FORBIDDEN_EXT = /\.(tsx?|jsx?|test\.[jt]sx?)$/

function walk(dir: string, acc: string[]): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      walk(full, acc)
    } else {
      acc.push(full)
    }
  }
  return acc
}

describe("public/ — static assets only (s10-defect-sweep)", () => {
  it("contains no .ts/.tsx/.js/.jsx or *.test.* file", () => {
    const offenders = walk(publicDir, [])
      .filter((f) => FORBIDDEN_EXT.test(f) || /\.test\./.test(f))
      .map((f) => path.relative(publicDir, f))

    expect(
      offenders,
      `public/ must only contain static assets served as-is at the site root; ` +
        `found source/test file(s): ${offenders.join(", ")}`,
    ).toEqual([])
  })
})
