import type { ReactNode } from "react"
import { Title } from "@/components/ui/title"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Example, type ExampleLabels } from "@/components/gallery/example"
import { TextFieldDemo } from "@/components/gallery/text-field-demo"
import type { Snippet } from "@/components/gallery/snippet"

export type BlocksLabels = ExampleLabels & {
  pageHeaderName: string
  pricingName: string
  formName: string
  emptyName: string
  statRowName: string
  pageHeaderTitle: string
  pageHeaderSubtitle: string
  pageHeaderCta: string
  pricingKicker: string
  pricingBadge: string
  pricingTitle: string
  pricingPrice: string
  pricingCta: string
  formTitle: string
  formEmailLabel: string
  formPasswordLabel: string
  formCta: string
  emptyTitle: string
  emptyBody: string
  emptyCta: string
  statLabel1: string
  statLabel2: string
  statLabel3: string
}

/**
 * T5 (s12-ui-gallery) — five blocks assembled only from existing
 * `components/ui` primitives (Container, Card, Title, Text, Button, Badge,
 * SectionLabel, TextField, StatCard) — no primitive invented. Each block is
 * one `Snippet` tree, so its rendered preview and its copyable code (T3)
 * come from the same source as the primitives above.
 */
export function BlocksSection({ labels }: { labels: BlocksLabels }) {
  const exampleLabels: ExampleLabels = {
    copy: labels.copy,
    copied: labels.copied,
    codeShow: labels.codeShow,
    codeHide: labels.codeHide,
  }

  const blocks: { name: string; snippet: Snippet; render?: ReactNode }[] = [
    // Page header — Container + Title + Text + Button, as on /dashboard.
    {
      name: labels.pageHeaderName,
      snippet: {
        component: "Container",
        // s15-gallery-feedback (annotation mtisujnabzm) — none of
        // Title/Text/Button apply their own vertical margin, so a
        // composed block needs its own spacing between them.
        props: { className: "space-y-3" },
        children: [
          {
            component: "Title",
            props: { as: "h1" },
            children: labels.pageHeaderTitle,
          },
          {
            component: "Text",
            props: { size: "base", leading: true },
            children: labels.pageHeaderSubtitle,
          },
          {
            component: "Button",
            props: { variant: "primary" },
            children: labels.pageHeaderCta,
          },
        ],
      },
    },
    // Pricing section — Card + Badge + Button + SectionLabel, as on /pricing.
    //
    // s16-gallery-fixes (annotation `mtiw7nypry9`, "Card buggué") —
    // SectionLabel and Badge are both `inline-flex` (section-label.tsx,
    // badge.tsx), so they flow onto the SAME LINE with no separation: the
    // Card's `space-y-3` sets a vertical margin (`margin-block-end` in this
    // Tailwind v4 build), which cannot create a gap between two elements
    // sharing one line horizontally. Confirmed live (headless Chrome,
    // DEMO_MODE=1): their edges touched at the exact same x — 317.859375 —
    // with zero gap. Diagnosed AND checked out at f53ce0e (s13, before s15
    // added `space-y-3` here) to rule out a regression: the same zero gap
    // measured there too, because this Card had no spacing className at
    // all back then. PRE-EXISTING DEFECT, not an s15 regression — s15's
    // `space-y-3` did its job on the block-level siblings below (Title/
    // Text/Button really did gain gaps), it just never could have reached
    // this pair, which isn't block-level in the first place.
    //
    // Fix: wrap SectionLabel + Badge in their own flex-row (plain "div"
    // snippet node, same precedent as the form block's spacing wrapper
    // below) with a real `gap-3` — expressed IN the snippet, not a
    // `render` override, so the copyable code keeps matching the preview
    // (s12 major 2).
    {
      name: labels.pricingName,
      snippet: {
        component: "Card",
        props: { pad: "lg", className: "space-y-3" },
        children: [
          {
            component: "div",
            props: { className: "flex flex-wrap items-center gap-3" },
            children: [
              {
                component: "SectionLabel",
                props: { index: "01" },
                children: labels.pricingKicker,
              },
              {
                component: "Badge",
                props: { tone: "pine" },
                children: labels.pricingBadge,
              },
            ],
          },
          {
            component: "Title",
            props: { as: "h2" },
            children: labels.pricingTitle,
          },
          {
            component: "Text",
            props: { size: "base" },
            children: labels.pricingPrice,
          },
          {
            component: "Button",
            props: { variant: "primary" },
            children: labels.pricingCta,
          },
        ],
      },
    },
    // Form — FieldLabel + TextField + Button, as in the auth screens.
    //
    // The wrapper's spacing (`mt-3 space-y-3`) and the Button's `mt-4` are
    // both expressed as `className` props IN the snippet below (plain HTML
    // "div" node — see snippet.ts), so `codeOf` shows them too: review fix
    // (s12-ui-gallery, major 2) — they used to exist only in `render`, so
    // the copyable code silently omitted layout visible in the preview.
    //
    // ESCAPE HATCH: `render` is still needed for the two TextField leaves —
    // TextField spreads a react-hook-form-shaped `registration` (incl. a
    // `ref` callback) onto its <input>; React refuses that from a Server
    // Component render pass ("Refs cannot be used in Server Components"),
    // reproduced with a real `DEMO_MODE=1 next build`. That is now the ONLY
    // divergence between this `render` and `renderSnippet(snippet)`: every
    // other node (Card, Title, the div, Button) is identical to the snippet.
    {
      name: labels.formName,
      snippet: {
        component: "Card",
        props: { pad: "lg" },
        children: [
          {
            component: "Title",
            props: { as: "h3" },
            children: labels.formTitle,
          },
          {
            component: "div",
            props: { className: "mt-3 space-y-3" },
            children: [
              {
                component: "TextField",
                props: {
                  label: labels.formEmailLabel,
                  type: "email",
                  registration: { code: 'register("email")', value: {} },
                },
              },
              {
                component: "TextField",
                props: {
                  label: labels.formPasswordLabel,
                  type: "password",
                  registration: { code: 'register("password")', value: {} },
                },
              },
            ],
          },
          {
            component: "Button",
            props: { variant: "primary", className: "mt-4" },
            children: labels.formCta,
          },
        ],
      },
      // ESCAPE HATCH: TextField's ref-bearing `registration` (see the
      // comment above this block for why) — everything else in this tree
      // is identical to the snippet above.
      render: (
        <Card pad="lg">
          <Title as="h3">{labels.formTitle}</Title>
          <div className="mt-3 space-y-3">
            <TextFieldDemo
              label={labels.formEmailLabel}
              type="email"
              name="email"
            />
            <TextFieldDemo
              label={labels.formPasswordLabel}
              type="password"
              name="password"
            />
          </div>
          <Button variant="primary" className="mt-4">
            {labels.formCta}
          </Button>
        </Card>
      ),
    },
    // Empty state — Card + Title + Text + Button.
    {
      name: labels.emptyName,
      snippet: {
        component: "Card",
        // s15-gallery-feedback (annotation mtisujnabzm) — the circled
        // block: title, text and button were rendering flush together.
        props: { pad: "lg", className: "space-y-3" },
        children: [
          {
            component: "Title",
            props: { as: "h3" },
            children: labels.emptyTitle,
          },
          {
            component: "Text",
            props: { size: "sm" },
            children: labels.emptyBody,
          },
          {
            component: "Button",
            props: { variant: "subtle" },
            children: labels.emptyCta,
          },
        ],
      },
    },
    // Stat row — StatCard ×3.
    {
      name: labels.statRowName,
      snippet: {
        component: "Container",
        props: { className: "flex flex-wrap gap-4" },
        children: [
          {
            component: "StatCard",
            props: { label: labels.statLabel1, value: "1,204", trend: "+12%" },
          },
          {
            component: "StatCard",
            props: { label: labels.statLabel2, value: "84%", trend: "+3%" },
          },
          {
            component: "StatCard",
            props: { label: labels.statLabel3, value: "€9,400" },
          },
        ],
      },
    },
  ]

  return (
    <div className="mt-10 space-y-10">
      {blocks.map(({ name, snippet, render }, i) => (
        <section key={i}>
          <Title as="h4">{name}</Title>
          <div className="mt-4">
            <Example snippet={snippet} labels={exampleLabels} render={render} />
          </div>
        </section>
      ))}
    </div>
  )
}
