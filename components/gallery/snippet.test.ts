import { describe, it, expect } from "vitest"
import { isValidElement, type ComponentType } from "react"
import { codeOf, renderSnippet, type Snippet } from "./snippet"

// T3 (s12-ui-gallery) — the AC requires the code shown next to a primitive
// to match what is actually rendered above it. Two hand-written sources
// (JSX + a code string) drift the moment either one is edited alone. The
// fix: a single `Snippet` structure (component name + props + children) is
// the only input to BOTH `renderSnippet` (produces the live element) and
// `codeOf` (produces the copyable text) — there is no second place either
// function could read from, so they cannot diverge by construction.
//
// These tests pin that guarantee: given one `Snippet`, `renderSnippet`'s
// element and `codeOf`'s text are asserted to reflect the *exact same*
// component/props/children. A fake, dependency-free components map is used
// deliberately (not components-map.ts) — see components-map.test.ts's
// header comment for why real components/ui modules cannot be imported
// under this repo's Vitest config (next-intl navigation resolution).

function Leaf(_props: Record<string, unknown>) {
  return null
}
function Wrapper(_props: Record<string, unknown>) {
  return null
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FAKE_COMPONENTS: Readonly<Record<string, ComponentType<any>>> = {
  Leaf,
  Wrapper,
}

describe("snippet — renderSnippet and codeOf derive from one Snippet (cannot diverge)", () => {
  it("string prop: same key/value in the rendered element and the code text", () => {
    const node: Snippet = {
      component: "Leaf",
      props: { tone: "success" },
      children: "Active",
    }

    const element = renderSnippet(node, FAKE_COMPONENTS)
    expect(element.type).toBe(Leaf)
    expect(element.props).toMatchObject({ tone: "success", children: "Active" })
    expect(codeOf(node)).toBe('<Leaf tone="success">Active</Leaf>')
  })

  it("boolean true prop: bare attribute in code, `true` in the rendered props", () => {
    const node: Snippet = {
      component: "Leaf",
      props: { dot: true },
      children: "Status",
    }

    const element = renderSnippet(node, FAKE_COMPONENTS)
    expect(element.props).toMatchObject({ dot: true })
    expect(codeOf(node)).toBe("<Leaf dot>Status</Leaf>")
  })

  it("boolean false prop and number prop: explicit in both outputs", () => {
    const node: Snippet = {
      component: "Leaf",
      props: { dot: false, index: 2 },
    }

    const element = renderSnippet(node, FAKE_COMPONENTS)
    expect(element.props).toMatchObject({ dot: false, index: 2 })
    expect(codeOf(node)).toBe("<Leaf dot={false} index={2} />")
  })

  it("no children: self-closes in code, no children prop on the element", () => {
    const node: Snippet = { component: "Leaf" }

    const element = renderSnippet(node, FAKE_COMPONENTS)
    expect(element.props).not.toHaveProperty("children")
    expect(codeOf(node)).toBe("<Leaf />")
  })

  it("code-override prop (non-serialisable runtime value): code shows the override, render uses the real value", () => {
    const registration = { name: "email" }
    const node: Snippet = {
      component: "Leaf",
      props: {
        registration: { code: 'register("email")', value: registration },
      },
    }

    const element = renderSnippet(node, FAKE_COMPONENTS)
    expect(element.props).toMatchObject({ registration })
    expect(codeOf(node)).toBe('<Leaf registration={register("email")} />')
  })

  it("single nested Snippet child: same nesting in the rendered tree and the code text", () => {
    const node: Snippet = {
      component: "Wrapper",
      children: {
        component: "Leaf",
        props: { tone: "muted" },
        children: "Inner",
      },
    }

    const element = renderSnippet(node, FAKE_COMPONENTS)
    expect(element.type).toBe(Wrapper)
    const child = element.props.children
    expect(isValidElement(child)).toBe(true)
    expect((child as React.ReactElement).type).toBe(Leaf)
    expect((child as React.ReactElement<{ tone: string }>).props.tone).toBe(
      "muted",
    )
    expect(codeOf(node)).toBe(
      ["<Wrapper>", '  <Leaf tone="muted">Inner</Leaf>', "</Wrapper>"].join(
        "\n",
      ),
    )
  })

  it("array of Snippet children: same order and count in the rendered tree and the code text", () => {
    const node: Snippet = {
      component: "Wrapper",
      children: [
        { component: "Leaf", props: { index: 1 } },
        { component: "Leaf", props: { index: 2 } },
      ],
    }

    const element = renderSnippet(node, FAKE_COMPONENTS)
    const children = element.props.children as React.ReactElement[]
    expect(children).toHaveLength(2)
    expect(children.map((c) => (c.props as { index: number }).index)).toEqual([
      1, 2,
    ])
    expect(codeOf(node)).toBe(
      [
        "<Wrapper>",
        "  <Leaf index={1} />",
        "  <Leaf index={2} />",
        "</Wrapper>",
      ].join("\n"),
    )
  })

  it("throws for a component name absent from the components map (fails loud, not silently blank)", () => {
    const node: Snippet = { component: "Ghost" }
    expect(() => renderSnippet(node, FAKE_COMPONENTS)).toThrow(/Ghost/)
  })

  // Review fix (s12-ui-gallery, major 2) — a lowercase `component` name
  // (e.g. "div") is treated as a literal host element, not looked up in the
  // components map: `createElement` accepts a string tag directly. This
  // lets a purely-structural wrapper (spacing, layout) be expressed IN the
  // snippet instead of only in a hand-composed `render` override, so it
  // cannot drift from the copyable code — closing the exact gap the form
  // block's `render` had (a `<div className="mt-3 space-y-3">` wrapper
  // present in the live render, absent from the code).
  it("lowercase component name (raw HTML tag): renders as a host element, not looked up in the components map", () => {
    const node: Snippet = {
      component: "div",
      props: { className: "mt-3 space-y-3" },
      children: { component: "Leaf", children: "Inner" },
    }

    const element = renderSnippet(node, FAKE_COMPONENTS)
    expect(element.type).toBe("div")
    expect(element.props).toMatchObject({ className: "mt-3 space-y-3" })
    expect(codeOf(node)).toBe(
      [
        '<div className="mt-3 space-y-3">',
        "  <Leaf>Inner</Leaf>",
        "</div>",
      ].join("\n"),
    )
  })
})
