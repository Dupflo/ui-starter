import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// Bug fix (fix/modal-close-size-snap) — "Quand les modal se ferme elle se
// reduise bizarrement": `ModalDemo` used to drive `open` and `size` off the
// SAME nullable piece of state (`openSize`) — `open={openSize !== null}`,
// `size={openSize ?? "md"}`. `components/ui/modal.tsx` deliberately stays
// MOUNTED for EXIT_MS (300ms) after `open` flips false, to play its close
// animation — but `openSize ?? "md"` falls back to `"md"` the INSTANT
// `openSize` is nulled, one render before the close animation even starts.
// A modal opened at `3xl` therefore renders its whole exit animation at the
// `md` width class (`sizes["md"]` = `sm:max-w-md`) instead of `3xl`'s — it
// visibly snaps narrow as it fades out. The wider the size, the more
// obvious. Confirmed by reading components/ui/modal.tsx: `size` only ever
// feeds `sizes[size]` into the panel's className, with no internal memory
// of a prior size — the primitive trusts the caller to keep it stable.
//
// Fix: `ModalDemo` now remembers the last OPENED size in its own state and
// keeps passing that (never a hardcoded fallback) as `size`, for the whole
// lifetime of the Modal — open AND closing. `openSize` alone still drives
// `open`, but no longer feeds `size` at all.
//
// SOURCE-LEVEL, NOT A RUNTIME RENDER: modal-demo.tsx is "use client" and
// imports `Button` (→ "@/i18n/navigation" → next-intl → "next/navigation"),
// which does not resolve under this repo's Vitest config — the same
// constraint modal-sizes.test.ts's header documents, and the same
// convention every colocated test in this repo follows for exactly that
// reason (components-map.test.ts, escape-hatch.test.ts).
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")
}

const source = readFileSync(
  fileURLToPath(new URL("./modal-demo.tsx", import.meta.url)),
  "utf8",
)
const code = stripComments(source)

describe("Modal close animation keeps its opened size (fix/modal-close-size-snap)", () => {
  it("does not feed `size` from `openSize` with a fallback to a hardcoded default", () => {
    // This is exactly the pattern that caused the snap: the instant
    // `openSize` goes null (close requested), the fallback kicks in one
    // render before the close animation starts, while Modal is still
    // mounted playing it.
    expect(code).not.toMatch(/size=\{\s*openSize\s*\?\?/)
  })

  it("keeps a size value that survives `openSize` becoming null", () => {
    // A second piece of state, set alongside `openSize` when a trigger is
    // clicked, is the only way to keep `size` stable once `openSize` is
    // nulled on close — `openSize` itself cannot do it, it IS the value
    // that goes null.
    expect(code).toMatch(/useState<keyof typeof sizes>\(/)
  })

  it("feeds `<Modal>`'s `size` prop from that persisted value, not from `openSize`", () => {
    const modalBlockMatch = code.match(/<Modal\b[\s\S]*?(?<!=)>/)
    expect(modalBlockMatch, "expected a <Modal ...> opening tag").toBeTruthy()
    const modalBlock = modalBlockMatch![0]
    const sizePropMatch = modalBlock.match(/size=\{([^}]*)\}/)
    expect(sizePropMatch, "expected a size={...} prop on <Modal>").toBeTruthy()
    const sizeExpr = sizePropMatch![1].trim()
    expect(sizeExpr).not.toBe("openSize")
    expect(sizeExpr).not.toMatch(/^openSize\s*\?\?/)
  })
})
