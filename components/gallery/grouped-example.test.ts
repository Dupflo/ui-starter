import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// s15-gallery-feedback (annotation `mtit5zbxei1`) — "on peut grouper
// plusieurs badge ensemble et affiche le code en une fois". Badge rendered
// 10 separate cards (7 tones + 2 sizes + 1 dot), each its own `<Example>`
// with its own "Voir le code"/"Copier"; Button rendered 11. `GroupedExample`
// generalizes `Example`'s shell (preview row + one `CodeDisclosure`) to N
// items instead of 1: one preview row showing every item, one code block
// joining every item's `codeOf(snippet)`.
//
// `Example` becomes GroupedExample's N=1 case — not a parallel
// implementation — so every existing single-item call site (Modal,
// Lightbox, the two TextField escape hatches, all five composed blocks)
// keeps deriving its code from the exact same `codeOf`/`CodeDisclosure`
// path, with nothing new to diverge.
//
// SOURCE-LEVEL: example.tsx imports components-map.ts, which imports
// LocaleMenu/LocaleSwitcher → "@/i18n/navigation" → "next/navigation", the
// same unresolvable-under-Vitest chain every other gallery guard documents
// (see components-map.test.ts's header).

const source = readFileSync(
  fileURLToPath(new URL("./example.tsx", import.meta.url)),
  "utf8",
)

describe("GroupedExample — one preview row, one code block, N items (s15-gallery-feedback)", () => {
  it("is exported", () => {
    expect(source).toMatch(/export function GroupedExample/)
  })

  it("joins every item's codeOf(snippet) into the single CodeDisclosure code", () => {
    expect(source).toMatch(/items\s*\.map\(\s*\([^)]*\)\s*=>\s*codeOf\(/)
    expect(source).toMatch(/\.join\(/)
  })

  it("renders exactly one CodeDisclosure per GroupedExample (not one per item)", () => {
    const groupedBody = source.slice(
      source.indexOf("export function GroupedExample"),
    )
    const matches = groupedBody.match(/<CodeDisclosure/g) ?? []
    expect(matches.length).toBe(1)
  })

  it("Example (the single-item case) delegates to GroupedExample instead of duplicating the shell", () => {
    const exampleStart = source.indexOf("export function Example")
    const groupedStart = source.indexOf("export function GroupedExample")
    expect(exampleStart).toBeGreaterThan(-1)
    expect(groupedStart).toBeGreaterThan(-1)

    // Whichever of the two is declared first in the file, its body ends
    // where the other one's declaration starts.
    const exampleBody =
      exampleStart < groupedStart
        ? source.slice(exampleStart, groupedStart)
        : source.slice(exampleStart)

    expect(exampleBody).toMatch(/<GroupedExample/)
    // Example itself must not render its own CodeDisclosure anymore — that
    // now lives only inside GroupedExample (see the "exactly one" test above).
    expect(exampleBody).not.toMatch(/<CodeDisclosure/)
  })

  // s15-gallery-feedback (follow-up) — Button's outline/ghost variants
  // rendered invisible (text-paper on the preview row's bg-paper). The fix
  // patches a legible backdrop around JUST that item, inside the shared
  // preview row — not the whole group's previewClassName, which would
  // wrongly recolour every other variant in the same row too.
  it("supports a per-item previewClassName that patches only that item's own surface", () => {
    const groupedBody = source.slice(
      source.indexOf("export function GroupedExample"),
    )
    expect(groupedBody).toMatch(/item\.previewClassName/)
  })
})
