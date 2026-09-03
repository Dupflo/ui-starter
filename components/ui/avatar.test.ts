import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, it, expect } from "vitest"
import { Avatar } from "./avatar"

// T3 (s18-ui-kit-polish) — like data-table.tsx (see that file's test
// header), avatar.tsx imports nothing but React and lib/cn: no
// "@/i18n/navigation" chain, so `renderToStaticMarkup` genuinely works here
// and these tests assert on REAL rendered HTML, not source text.
//
// Scope, strictly: image-or-initials, nothing else (no presence badge, no
// stacked group — a later story). Accessible name is the load-bearing
// guarantee here — verified structurally below (a real `alt`/`aria-label`
// in the markup); the actual browser AX-tree read happens in the story
// report, the same two-layer verification data-table.tsx's sort/keyboard
// behaviour got in s17.

describe("Avatar — image when `src` is provided (T3)", () => {
  it("renders an <img> with the real src", () => {
    const html = renderToStaticMarkup(
      createElement(Avatar, {
        src: "data:image/svg+xml,x",
        name: "Camille Girard",
      }),
    )
    expect(html).toMatch(/<img[^>]*src="data:image\/svg\+xml,x"/)
  })

  it("is a real <img>, not a background-image span (so alt/decorative semantics are native)", () => {
    const html = renderToStaticMarkup(
      createElement(Avatar, {
        src: "data:image/svg+xml,x",
        name: "Camille Girard",
      }),
    )
    expect(html.trimStart()).toMatch(/^<img\b/)
  })
})

describe("Avatar — initials fallback when `src` is absent (T3)", () => {
  it("renders the first letter of the first two words, uppercased", () => {
    const html = renderToStaticMarkup(
      createElement(Avatar, { name: "camille girard" }),
    )
    expect(html).toContain("CG")
  })

  it("a one-word name falls back to a single initial", () => {
    const html = renderToStaticMarkup(
      createElement(Avatar, { name: "Madonna" }),
    )
    expect(html).toContain(">M<")
  })

  it("renders no <img> at all when src is absent", () => {
    const html = renderToStaticMarkup(
      createElement(Avatar, { name: "Camille Girard" }),
    )
    expect(html).not.toContain("<img")
  })
})

describe("Avatar — accessible name (T3, informational — no adjacent visible name)", () => {
  it("an <img> avatar carries the person's name as its alt text", () => {
    const html = renderToStaticMarkup(
      createElement(Avatar, {
        src: "data:image/svg+xml,x",
        name: "Camille Girard",
      }),
    )
    expect(html).toMatch(/alt="Camille Girard"/)
  })

  it("an initials-fallback avatar carries the name via role=img + aria-label, not just a bare span", () => {
    const html = renderToStaticMarkup(
      createElement(Avatar, { name: "Camille Girard" }),
    )
    expect(html).toMatch(/role="img"/)
    expect(html).toMatch(/aria-label="Camille Girard"/)
  })
})

describe("Avatar — decorative (T3, next to an already-visible name)", () => {
  it("an <img> avatar has an empty alt and is out of the accessibility tree", () => {
    const html = renderToStaticMarkup(
      createElement(Avatar, {
        src: "data:image/svg+xml,x",
        name: "Camille Girard",
        decorative: true,
      }),
    )
    expect(html).toMatch(/alt=""/)
    expect(html).not.toMatch(/alt="Camille Girard"/)
  })

  it("an initials-fallback avatar is aria-hidden and carries no accessible name of its own", () => {
    const html = renderToStaticMarkup(
      createElement(Avatar, { name: "Camille Girard", decorative: true }),
    )
    expect(html).toMatch(/aria-hidden="true"/)
    expect(html).not.toMatch(/role="img"/)
    expect(html).not.toMatch(/aria-label=/)
  })
})

describe("Avatar — size (T3)", () => {
  it("defaults to the md size class", () => {
    const html = renderToStaticMarkup(
      createElement(Avatar, { name: "Camille Girard" }),
    )
    expect(html).toMatch(/class="[^"]*h-10[^"]*w-10/)
  })

  it('size="sm" renders the sm size class, not md\'s', () => {
    const html = renderToStaticMarkup(
      createElement(Avatar, { name: "Camille Girard", size: "sm" }),
    )
    expect(html).toMatch(/class="[^"]*h-8[^"]*w-8/)
    expect(html).not.toMatch(/h-10/)
  })
})
