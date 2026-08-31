import type { ReactNode } from "react"
import {
  variants as buttonVariants,
  sizes as buttonSizes,
} from "@/components/ui/button"
import { tones as badgeTones, sizes as badgeSizes } from "@/components/ui/badge"
import {
  variants as cardVariants,
  pads as cardPads,
} from "@/components/ui/card"
import { Title, looks as titleLooks } from "@/components/ui/title"
import {
  Text,
  sizes as textSizes,
  tones as textTones,
} from "@/components/ui/text"
import { tones as sectionLabelTones } from "@/components/ui/section-label"
import { Example, type ExampleLabels } from "@/components/gallery/example"
import { ModalDemo } from "@/components/gallery/modal-demo"
import { LightboxDemo } from "@/components/gallery/lightbox-demo"
import { TextFieldDemo } from "@/components/gallery/text-field-demo"
import type { Snippet } from "@/components/gallery/snippet"

type GridItem = {
  snippet: Snippet
  render?: ReactNode
  previewClassName?: string
}

export type PrimitivesLabels = ExampleLabels & {
  disabledLabel: string
  errorExample: string
  fieldLabelExample: string
  containerPreview: string
  selectLabel: string
  selectOptionALabel: string
  selectOptionBLabel: string
  statLabelExample: string
  /** T4 (s13-gallery-ergonomics) — RAW i18n template with a literal
   *  "{size}" placeholder (e.g. "Ouvrir ({size})", from `t.raw()` — not
   *  `t()`), interpolated per size in `ModalDemo` (see its doc comment for
   *  why the derivation lives there, not here). */
  modalTriggerTemplate: string
  modalTitle: string
  modalBody: string
  lightboxTrigger: string
  lightboxCaption: string
  /** Review fix (s13-gallery-ergonomics, minor 3) — caption for the second
   *  `sample.png` slide LightboxDemo lists, so prev/next has two distinct
   *  captions to cycle between (see LightboxDemo's own doc comment). */
  lightboxCaptionAlt: string
  lightboxClose: string
  lightboxPrev: string
  lightboxNext: string
  localeCaption: string
}

/**
 * T4 (s12-ui-gallery) — one group per `components/ui` primitive. Every
 * variant/tone/size list below is `Object.keys()` over the table T1 exported
 * from that primitive's own module — never a hand-copied list — so a
 * variant added, renamed or removed there shows up here automatically.
 */
export function PrimitivesSection({ labels }: { labels: PrimitivesLabels }) {
  const exampleLabels: ExampleLabels = {
    copy: labels.copy,
    copied: labels.copied,
    codeShow: labels.codeShow,
    codeHide: labels.codeHide,
  }

  return (
    <div className="mt-10 space-y-14">
      <PrimitiveGroup name="Button">
        <ExampleGrid
          labels={exampleLabels}
          items={[
            ...Object.keys(buttonVariants).map(
              (variant): GridItem => ({
                snippet: {
                  component: "Button",
                  props: { variant },
                  children: variant,
                },
              }),
            ),
            ...Object.keys(buttonSizes).map(
              (size): GridItem => ({
                snippet: {
                  component: "Button",
                  props: { size },
                  children: size,
                },
              }),
            ),
            {
              snippet: {
                component: "Button",
                props: { disabled: true },
                children: labels.disabledLabel,
              },
            },
          ]}
        />
      </PrimitiveGroup>

      <PrimitiveGroup name="Badge">
        <ExampleGrid
          labels={exampleLabels}
          items={[
            ...Object.keys(badgeTones).map(
              (tone): GridItem => ({
                snippet: {
                  component: "Badge",
                  props: { tone },
                  children: tone,
                },
              }),
            ),
            ...Object.keys(badgeSizes).map(
              (size): GridItem => ({
                snippet: {
                  component: "Badge",
                  props: { size },
                  children: size,
                },
              }),
            ),
            {
              snippet: {
                component: "Badge",
                props: { tone: "success", dot: true },
                children: "dot",
              },
            },
          ]}
        />
      </PrimitiveGroup>

      <PrimitiveGroup name="Card / StatCard">
        <ExampleGrid
          labels={exampleLabels}
          items={[
            ...Object.keys(cardVariants).map(
              (variant): GridItem => ({
                snippet: {
                  component: "Card",
                  props: { variant },
                  children: variant,
                },
              }),
            ),
            ...Object.keys(cardPads).map(
              (pad): GridItem => ({
                snippet: {
                  component: "Card",
                  props: { pad },
                  children: pad,
                },
              }),
            ),
            {
              snippet: {
                component: "StatCard",
                props: {
                  label: labels.statLabelExample,
                  value: "128",
                  trend: "+4%",
                },
              },
            },
          ]}
        />
      </PrimitiveGroup>

      <PrimitiveGroup name="Title">
        <ExampleGrid
          labels={exampleLabels}
          items={Object.keys(titleLooks).map(
            (as): GridItem => ({
              snippet: { component: "Title", props: { as }, children: as },
            }),
          )}
        />
      </PrimitiveGroup>

      <PrimitiveGroup name="Text">
        <ExampleGrid
          labels={exampleLabels}
          items={[
            ...Object.keys(textSizes).map(
              (size): GridItem => ({
                snippet: { component: "Text", props: { size }, children: size },
              }),
            ),
            ...Object.keys(textTones).map(
              (tone): GridItem => ({
                snippet: { component: "Text", props: { tone }, children: tone },
              }),
            ),
          ]}
        />
      </PrimitiveGroup>

      <PrimitiveGroup name="SectionLabel">
        <ExampleGrid
          labels={exampleLabels}
          items={Object.keys(sectionLabelTones).map(
            (tone): GridItem => ({
              snippet: {
                component: "SectionLabel",
                props: { tone, index: "01" },
                children: tone,
              },
            }),
          )}
        />
      </PrimitiveGroup>

      <PrimitiveGroup name="Container">
        <ExampleGrid
          labels={exampleLabels}
          items={[
            {
              snippet: {
                component: "Container",
                children: {
                  component: "Text",
                  children: labels.containerPreview,
                },
              },
            },
          ]}
        />
      </PrimitiveGroup>

      <PrimitiveGroup name="Select">
        <ExampleGrid
          labels={exampleLabels}
          items={[
            {
              snippet: {
                component: "Select",
                props: {
                  label: labels.selectLabel,
                  options: {
                    code: `[{ value: "a", label: "${labels.selectOptionALabel}" }, { value: "b", label: "${labels.selectOptionBLabel}" }]`,
                    value: [
                      { value: "a", label: labels.selectOptionALabel },
                      { value: "b", label: labels.selectOptionBLabel },
                    ],
                  },
                },
              },
            },
          ]}
        />
      </PrimitiveGroup>

      <PrimitiveGroup name="FieldLabel / TextField">
        <ExampleGrid
          labels={exampleLabels}
          items={[
            {
              snippet: {
                component: "FieldLabel",
                children: labels.fieldLabelExample,
              },
            },
            {
              snippet: {
                component: "TextField",
                props: {
                  label: labels.fieldLabelExample,
                  type: "email",
                  registration: { code: 'register("email")', value: {} },
                },
              },
              // ESCAPE HATCH: TextField spreads a react-hook-form `registration`
              // (incl. a `ref` callback) onto its <input> — React refuses that
              // from a Server Component render pass. TextFieldDemo is the
              // client boundary that makes it real; the snippet above is
              // otherwise identical (see TextFieldDemo's own doc comment).
              render: (
                <TextFieldDemo
                  label={labels.fieldLabelExample}
                  type="email"
                  name="email"
                />
              ),
            },
            {
              snippet: {
                component: "TextField",
                props: {
                  label: labels.fieldLabelExample,
                  type: "email",
                  registration: { code: 'register("email")', value: {} },
                  error: labels.errorExample,
                },
              },
              // ESCAPE HATCH: same reason as the field above.
              render: (
                <TextFieldDemo
                  label={labels.fieldLabelExample}
                  type="email"
                  name="email"
                  error={labels.errorExample}
                />
              ),
            },
          ]}
        />
      </PrimitiveGroup>

      <PrimitiveGroup name="Modal">
        <Example
          labels={exampleLabels}
          snippet={{
            component: "Modal",
            props: {
              open: { code: "open", value: true },
              onClose: { code: "() => setOpen(false)", value: () => {} },
              title: labels.modalTitle,
              size: "md",
            },
            children: {
              component: "Text",
              props: { size: "sm", leading: true },
              children: labels.modalBody,
            },
          }}
          // ESCAPE HATCH: Modal is controlled (open/onClose) and mounts a
          // portal-like overlay — it needs a trigger and local state, which a
          // static snippet render cannot provide. ModalDemo (see its own doc
          // comment) is that stateful wrapper. The snippet's `size: "md"`
          // pins Modal's own default (components/ui/modal.tsx) — ModalDemo
          // opens every other size live too (T4), but the copyable code can
          // only ever show one value, so it shows the default rather than
          // omitting the prop this story exists to demonstrate. Still a
          // single `render` usage — no new escape hatch.
          render={
            <ModalDemo
              triggerLabelTemplate={labels.modalTriggerTemplate}
              title={labels.modalTitle}
              body={labels.modalBody}
            />
          }
        />
      </PrimitiveGroup>

      <PrimitiveGroup name="Lightbox">
        <Example
          labels={exampleLabels}
          snippet={{
            component: "Lightbox",
            props: {
              images: {
                code: `[{ src: "/gallery/sample.png", alt: caption, caption }]`,
                value: [
                  {
                    src: "/gallery/sample.png",
                    alt: labels.lightboxCaption,
                    caption: labels.lightboxCaption,
                  },
                ],
              },
              index: { code: "index", value: 0 },
              onIndex: { code: "setIndex", value: () => {} },
              onClose: { code: "() => setIndex(null)", value: () => {} },
              labels: {
                code: "{ close, prev, next }",
                value: {
                  close: labels.lightboxClose,
                  prev: labels.lightboxPrev,
                  next: labels.lightboxNext,
                },
              },
            },
          }}
          // ESCAPE HATCH: same reason as Modal above — Lightbox is controlled
          // (index/onIndex/onClose) and needs a trigger with local state.
          // LightboxDemo (see its own doc comment) is that stateful wrapper.
          render={
            <LightboxDemo
              triggerLabel={labels.lightboxTrigger}
              caption={labels.lightboxCaption}
              captionAlt={labels.lightboxCaptionAlt}
              labels={{
                close: labels.lightboxClose,
                prev: labels.lightboxPrev,
                next: labels.lightboxNext,
              }}
            />
          }
        />
      </PrimitiveGroup>

      <PrimitiveGroup name="LocaleMenu / LocaleSwitcher">
        <Text size="xs" className="mb-3">
          {labels.localeCaption}
        </Text>
        <ExampleGrid
          labels={exampleLabels}
          items={[
            {
              snippet: { component: "LocaleMenu" },
              previewClassName: "bg-pine",
            },
            {
              snippet: { component: "LocaleSwitcher" },
              previewClassName: "bg-pine",
            },
          ]}
        />
      </PrimitiveGroup>
    </div>
  )
}

function PrimitiveGroup({
  name,
  children,
}: {
  name: string
  children: React.ReactNode
}) {
  return (
    <section>
      <Title as="h4">{name}</Title>
      {children}
    </section>
  )
}

function ExampleGrid({
  items,
  labels,
}: {
  items: GridItem[]
  labels: ExampleLabels
}) {
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ snippet, render, previewClassName }, i) => (
        <Example
          key={i}
          snippet={snippet}
          labels={labels}
          render={render}
          previewClassName={previewClassName}
        />
      ))}
    </div>
  )
}
