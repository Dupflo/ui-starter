import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// Review fix (s13-gallery-ergonomics, minor 2) — the Modal snippet in
// primitives-section.tsx carried `open`/`onClose`/`title` but never `size`,
// while `ModalDemo` (the live `render` override) opens
// `<Modal size={openSize ?? "md"}>`. Click "Ouvrir (3xl)", get a wide modal,
// copy the code, get a default `md` — the one prop this story exists to
// demonstrate was invisible in the copyable snippet. `size` now lives in the
// snippet's `props`, matching `Modal`'s own default (components/ui/modal.tsx
// — `size = "md"`), so `codeOf` and the escape-hatch comment both tell the
// truth about the copyable code's default render.

const source = readFileSync(
  fileURLToPath(new URL("./primitives-section.tsx", import.meta.url)),
  "utf8",
)

describe("Modal snippet — carries the demonstrated `size` prop", () => {
  it("Modal's snippet props include `size`", () => {
    const modalBlock = source.match(
      /component:\s*"Modal",[\s\S]*?component:\s*"Text",/,
    )
    expect(modalBlock).not.toBeNull()
    expect(modalBlock![0]).toMatch(/size:\s*"md"/)
  })
})
