import {
  cloneElement,
  createElement,
  isValidElement,
  type ComponentType,
  type ReactNode,
} from "react"

/**
 * T3 (s12-ui-gallery) — single source for "what's rendered" and "what's
 * shown as copyable code". A `Snippet` describes one JSX invocation
 * (component name + props + children, possibly nested); `renderSnippet`
 * and `codeOf` both read only this structure, nothing else — there is no
 * second source either can drift from.
 *
 * `SnippetPropValue`'s object form (`{ code, value }`) exists for the rare
 * prop whose real runtime value is not meaningfully serialisable as source
 * text (e.g. a react-hook-form `registration` object — a bag of closures).
 * For that prop, and only that prop, `code` is what's shown and `value` is
 * what's actually passed to the component; every other prop type
 * (string/number/boolean) is identical in both outputs by construction.
 */
export type SnippetPropValue =
  | string
  | number
  | boolean
  | { readonly code: string; readonly value: unknown }

export type Snippet = {
  readonly component: string
  readonly props?: Readonly<Record<string, SnippetPropValue>>
  readonly children?: string | Snippet | readonly Snippet[]
}

// The gallery's components have heterogeneous, mostly-incompatible prop
// shapes (Badge requires `children`, Container doesn't, TextField wants a
// `registration` object…) — there is no non-`any` prop type a single
// string-indexed component registry can honestly carry; this is the
// standard shape for such a registry (React's own `createElement` and
// MDX's component-map types resolve the same way). Contained to this one
// declaration; nothing downstream is untyped as a result.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ComponentsMap = Readonly<Record<string, ComponentType<any>>>

// ─── render ───────────────────────────────────────────────────────────────

// A lowercase `component` name (e.g. "div") is a literal host element, not
// a components/ui primitive — `createElement` accepts a string tag directly,
// so no components-map entry is needed. This is what lets a purely
// structural wrapper (spacing, layout — no design-system meaning of its
// own) live IN the snippet instead of only in a hand-composed `render`
// override, closing the review-fix (s12-ui-gallery, major 2) gap where the
// form block's spacing wrapper was invisible to `codeOf`.
const HTML_TAG_RE = /^[a-z][a-z0-9]*$/

export function renderSnippet(node: Snippet, components: ComponentsMap) {
  const Component = HTML_TAG_RE.test(node.component)
    ? node.component
    : components[node.component]
  if (!Component) {
    throw new Error(
      `renderSnippet: unknown component "${node.component}" — add it to the components map`,
    )
  }
  const props = resolveProps(node.props)
  const children = renderChildren(node.children, components)
  // `createElement`'s 3rd arg sets `props.children` even when passed
  // `undefined` explicitly — omit the call arg entirely for childless nodes
  // so `<Leaf />` truly carries no `children` prop.
  return children === undefined
    ? createElement(Component, props)
    : createElement(Component, props, children)
}

function resolveProps(
  props: Snippet["props"],
): Record<string, unknown> | undefined {
  if (!props) return undefined
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props)) {
    out[key] = isCodeOverride(value) ? value.value : value
  }
  return out
}

function renderChildren(
  children: Snippet["children"],
  components: ComponentsMap,
): ReactNode {
  if (children === undefined) return undefined
  if (typeof children === "string") return children
  if (Array.isArray(children)) {
    return children.map((child, i) => {
      const el = renderSnippet(child, components)
      return isValidElement(el) ? cloneElement(el, { key: i }) : el
    })
  }
  return renderSnippet(children as Snippet, components)
}

// ─── code ─────────────────────────────────────────────────────────────────

export function codeOf(node: Snippet, depth = 0): string {
  const pad = "  ".repeat(depth)
  const openTag = `<${node.component}${formatProps(node.props)}`

  if (node.children === undefined) {
    return `${pad}${openTag} />`
  }
  if (typeof node.children === "string") {
    return `${pad}${openTag}>${node.children}</${node.component}>`
  }

  const kids = Array.isArray(node.children) ? node.children : [node.children]
  const inner = kids.map((child) => codeOf(child, depth + 1)).join("\n")
  return `${pad}${openTag}>\n${inner}\n${pad}</${node.component}>`
}

function formatProps(props: Snippet["props"]): string {
  if (!props) return ""
  const parts = Object.entries(props).map(([key, value]) =>
    formatProp(key, value),
  )
  return parts.length ? ` ${parts.join(" ")}` : ""
}

function formatProp(key: string, value: SnippetPropValue): string {
  if (value === true) return key
  if (value === false) return `${key}={false}`
  if (typeof value === "number") return `${key}={${value}}`
  if (isCodeOverride(value)) return `${key}={${value.code}}`
  return `${key}="${value}"`
}

function isCodeOverride(
  value: SnippetPropValue,
): value is { readonly code: string; readonly value: unknown } {
  return typeof value === "object" && value !== null
}
