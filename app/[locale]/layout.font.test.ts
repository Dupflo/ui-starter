import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// T6 (s10-defect-sweep) — the font CSS variables loaded by app/fonts/index.ts
// must actually reach the DOM (applied on <html>) for @theme's var(--font-*)
// references to resolve to anything but the fallback stack.

const source = readFileSync(
  fileURLToPath(new URL("./layout.tsx", import.meta.url)),
  "utf8",
)

describe("app/[locale]/layout.tsx — applies self-hosted font variables (s10-defect-sweep T6)", () => {
  it("imports the font loaders from app/fonts", () => {
    expect(source).toMatch(
      /import\s*\{[^}]*plusJakartaSans[^}]*geist[^}]*geistMono[^}]*\}\s*from\s*["'](@\/app\/fonts|\.\.\/fonts)["']/,
    )
  })

  it("applies all three .variable classes to <html>", () => {
    const htmlOpenTag = source.match(/<html[^>]*>/)?.[0] ?? ""
    expect(htmlOpenTag).toMatch(/plusJakartaSans\.variable/)
    expect(htmlOpenTag).toMatch(/geist\.variable/)
    expect(htmlOpenTag).toMatch(/geistMono\.variable/)
  })
})
