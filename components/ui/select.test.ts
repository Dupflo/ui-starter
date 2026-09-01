import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it, expect } from "vitest"

// s15-gallery-feedback — the native `<select>`'s browser-drawn chevron was
// found overlapping the box's rounded right border on the running `/ui`
// gallery (annotation `mtit4rkft6s`). Diagnosed for real (headless
// Chromium against `npm run dev:demo`, see docs/research/s15-gallery-
// feedback.md): the gallery's flex preview row makes the wrapping `<label>`
// shrink to its content, so `select`'s `w-full` degenerates into fitting
// snugly around "Option A" + the arrow — leaving it almost no clearance.
// `locale-switcher.tsx`'s own hand-rolled `<select>` already avoids this
// with asymmetric padding (`pl-3 pr-7`) reserved for the native arrow; this
// pins the same idea on the shared `Select` primitive so all three call
// sites (the gallery, components/app/settings-form.tsx,
// components/demo/demo-banner-controls.tsx) inherit the fix at once.
//
// SOURCE-LEVEL: select.tsx has no "use client"/next-intl import chain
// issue, but every colocated primitive test in this repo reads source text
// rather than rendering (see components-map.test.ts's header) — followed
// here for consistency, and because the real bug reproduces through
// layout, not through anything a jsdom-less render could show anyway.

const source = readFileSync(
  fileURLToPath(new URL("./select.tsx", import.meta.url)),
  "utf8",
)

function extractSelectBase(src: string): string {
  const match = src.match(/const selectBase =\s*\n?\s*"([^"]+)"/)
  if (!match) throw new Error("selectBase class string not found in select.tsx")
  return match[1]
}

describe("Select — native chevron has reserved clearance (s15-gallery-feedback)", () => {
  it("does not use symmetric horizontal padding (px-*), which leaves the arrow no room", () => {
    const base = extractSelectBase(source)
    expect(base).not.toMatch(/\bpx-\d+\b/)
  })

  it("reserves strictly more right padding than left padding for the native arrow", () => {
    const base = extractSelectBase(source)
    const left = base.match(/\bpl-(\d+)\b/)
    const right = base.match(/\bpr-(\d+)\b/)

    expect(left, "expected an explicit pl-* class").not.toBeNull()
    expect(right, "expected an explicit pr-* class").not.toBeNull()
    expect(Number(right![1])).toBeGreaterThan(Number(left![1]))
  })
})
