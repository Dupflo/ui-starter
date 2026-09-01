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
import {
  Example,
  GroupedExample,
  type ExampleLabels,
} from "@/components/gallery/example"
import { ModalDemo } from "@/components/gallery/modal-demo"
import { LightboxDemo } from "@/components/gallery/lightbox-demo"
import { TextFieldDemo } from "@/components/gallery/text-field-demo"
import { surfacePatch, textToken } from "@/components/gallery/surface-contrast"
import type { Snippet } from "@/components/gallery/snippet"

/** One `GroupedExample` item: a live render (from the snippet, or an escape
 *  hatch) plus the snippet `codeOf` reads for the shared code block.
 *  `previewClassName` is a per-item surface patch (s15-gallery-feedback
 *  follow-up) — see `surfacePatch` and GroupedExample's own doc
 *  comment. */
type GroupItem = {
  snippet: Snippet
  render?: ReactNode
  previewClassName?: string
}

/** The gallery's default preview surface — `GroupedExample`/`Example`'s own
 *  `bg-paper` base class (example.tsx). Variants that set a text colour
 *  with no background of their own are checked against THIS token. */
const GALLERY_PREVIEW_SURFACE = "paper"

/** s16-gallery-fixes (annotation `mtiw8hcnkwy`) — the Button size group's
 *  `icon`-size example content: a real 16×16 stroke icon instead of the
 *  literal word "icon" (which the old `children: size` produced — an
 *  icon-only button whose content is its own size name demonstrates
 *  nothing). Same visual convention as the nav icons in
 *  `components/app/app-sidebar.tsx`'s `ICONS`/`NavIcon` (viewBox 0 0 16 16,
 *  `stroke="currentColor"`, `strokeWidth={1.5}`, round caps) — composed as
 *  plain SVG snippet nodes (lowercase `component`, see snippet.ts), the
 *  same way that file composes its own icons; there is no Icon primitive
 *  in the design system to reach for instead (checked docs/design-system.md
 *  — none listed). A generic "add" glyph, since this demo has no specific
 *  action to illustrate. */
const BUTTON_ICON_SIZE_EXAMPLE: Snippet = {
  component: "svg",
  props: {
    width: "16",
    height: "16",
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  },
  children: { component: "path", props: { d: "M8 3.5v9M3.5 8h9" } },
}

/** One `ExampleGrid` cell: either a single example, or a group of variants
 *  sharing one preview row and one code block (s15-gallery-feedback). */
type GridItem =
  | { snippet: Snippet; render?: ReactNode; previewClassName?: string }
  | { items: GroupItem[]; previewClassName?: string }

export type PrimitivesLabels = ExampleLabels & {
  disabledLabel: string
  errorExample: string
  fieldLabelExample: string
  containerPreview: string
  selectLabel: string
  selectOptionALabel: string
  selectOptionBLabel: string
  statLabelExample: string
  /** s15-gallery-feedback (annotation mtit5cqcr4q) — realistic body content
   *  for Card's variant/pad examples, so they read like StatCard already
   *  does instead of showing only the bare variant/pad name. */
  cardExampleTitle: string
  cardExampleBody: string
  // T7 (s14-dataviz-and-combobox) — chart wrapper demo data (series /
  // category names rendered on-chart: axis ticks, legend, tooltip).
  chartSeriesVisits: string
  chartCategoryJan: string
  chartCategoryFeb: string
  chartCategoryMar: string
  chartBarSeriesSignups: string
  chartBarCategoryQ1: string
  chartBarCategoryQ2: string
  chartBarCategoryQ3: string
  chartDonutSliceFree: string
  chartDonutSlicePro: string
  chartDonutSliceEnterprise: string
  // T7 (s14-dataviz-and-combobox) — combobox demo
  comboboxLabel: string
  comboboxPlaceholder: string
  comboboxEmptyLabel: string
  /** RAW i18n template with a literal "{count}" placeholder (t.raw(), not
   *  t()) — Combobox itself interpolates it (see its own doc comment,
   *  same convention as ModalDemo's "{size}"). */
  comboboxResultsLabel: string
  comboboxOptionFrance: string
  comboboxOptionGermany: string
  comboboxOptionSpain: string
  comboboxNoMatchQuery: string
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
  /** s15-gallery-feedback (second follow-up) — caption for the Button
   *  group's bg-pine patch, same precedent as `localeCaption` above for the
   *  identical situation (LocaleMenu/LocaleSwitcher's own dark-chrome
   *  preview). */
  buttonDarkCaption: string
  /** s16-gallery-fixes — accessible name for the Button size group's
   *  `icon`-size example, which no longer carries visible text (a real SVG
   *  icon replaced the literal word "icon" — see
   *  BUTTON_ICON_SIZE_EXAMPLE's doc comment). */
  buttonIconLabel: string
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
        <Text size="xs" className="mb-3">
          {labels.buttonDarkCaption}
        </Text>
        <div className="mt-4">
          <GroupedExample
            labels={exampleLabels}
            items={[
              // s15-gallery-feedback (follow-up) — `outline`/`ghost` set
              // `text-paper` with no background of their own: designed for
              // the dark `pine` chrome, invisible on this row's default
              // `bg-paper`. Derived from each variant's OWN class string via
              // `surfacePatch` — never a hardcoded "outline/ghost are the
              // dark ones" list, which would silently stop covering a new
              // variant shaped the same way later (see
              // surface-contrast.test.ts's "Button variants" block, which
              // guards this behaviourally rather than by variant name).
              ...Object.entries(buttonVariants).map(
                ([variant, variantClasses]): GroupItem => ({
                  snippet: {
                    component: "Button",
                    props: { variant },
                    children: variant,
                  },
                  previewClassName: surfacePatch(
                    variantClasses,
                    GALLERY_PREVIEW_SURFACE,
                    "bg-pine",
                  ),
                }),
              ),
              ...Object.keys(buttonSizes).map(
                (size): GroupItem => ({
                  snippet: {
                    component: "Button",
                    // s16-gallery-fixes — every OTHER size still shows its
                    // own name as plain text; only "icon" swaps in a real
                    // icon (see BUTTON_ICON_SIZE_EXAMPLE's doc comment) plus
                    // an aria-label, since it no longer has visible text to
                    // serve as its accessible name.
                    props:
                      size === "icon"
                        ? { size, "aria-label": labels.buttonIconLabel }
                        : { size },
                    children: size === "icon" ? BUTTON_ICON_SIZE_EXAMPLE : size,
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
        </div>
      </PrimitiveGroup>

      <PrimitiveGroup name="Badge">
        <div className="mt-4">
          <GroupedExample
            labels={exampleLabels}
            items={[
              ...Object.keys(badgeTones).map(
                (tone): GroupItem => ({
                  snippet: {
                    component: "Badge",
                    props: { tone },
                    children: tone,
                  },
                }),
              ),
              ...Object.keys(badgeSizes).map(
                (size): GroupItem => ({
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
        </div>
      </PrimitiveGroup>

      <PrimitiveGroup name="Card / StatCard">
        <ExampleGrid
          labels={exampleLabels}
          items={[
            // s15-gallery-feedback (annotation mtit5cqcr4q) — realistic
            // content (kicker + title + body), like StatCard already has,
            // instead of a bare variant name; grouped (annotation
            // mtit5zbxei1) into one preview row + one code block, like
            // Badge/Button above. StatCard stays its own card: a different
            // component, not a variant of Card.
            {
              items: [
                ...Object.entries(cardVariants).map(
                  ([variant, variantClasses]): GroupItem => ({
                    snippet: {
                      component: "Card",
                      props: { variant, className: "space-y-2" },
                      children: cardExampleChildren(
                        variant,
                        // Derived from the variant's own resting text
                        // colour (`textToken`, not a hardcoded "pine is the
                        // dark one" assumption or a raw substring match) —
                        // so a renamed/added dark variant using the SAME
                        // `text-paper` override still gets readable
                        // children without touching this file. That is a
                        // narrower claim than "any dark variant": Tailwind
                        // cannot build `text-${token}` from an arbitrary
                        // token at runtime (static class extraction, ADR
                        // 002), so `cardExampleChildren`'s override is
                        // still the literal `text-paper` — a future dark
                        // variant whose own text colour is some OTHER
                        // token would still need that literal touched.
                        textToken(variantClasses) === "paper",
                        labels,
                      ),
                    },
                  }),
                ),
                ...Object.keys(cardPads).map(
                  (pad): GroupItem => ({
                    snippet: {
                      component: "Card",
                      props: { pad, className: "space-y-2" },
                      children: cardExampleChildren(pad, false, labels),
                    },
                  }),
                ),
              ],
            },
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
        <div className="mt-4">
          <GroupedExample
            labels={exampleLabels}
            items={Object.keys(titleLooks).map(
              (as): GroupItem => ({
                snippet: { component: "Title", props: { as }, children: as },
              }),
            )}
          />
        </div>
      </PrimitiveGroup>

      <PrimitiveGroup name="Text">
        <div className="mt-4">
          <GroupedExample
            labels={exampleLabels}
            items={[
              ...Object.keys(textSizes).map(
                (size): GroupItem => ({
                  snippet: {
                    component: "Text",
                    props: { size },
                    children: size,
                  },
                }),
              ),
              ...Object.keys(textTones).map(
                (tone): GroupItem => ({
                  snippet: {
                    component: "Text",
                    props: { tone },
                    children: tone,
                  },
                }),
              ),
            ]}
          />
        </div>
      </PrimitiveGroup>

      <PrimitiveGroup name="SectionLabel">
        <div className="mt-4">
          <GroupedExample
            labels={exampleLabels}
            items={Object.keys(sectionLabelTones).map(
              (tone): GroupItem => ({
                snippet: {
                  component: "SectionLabel",
                  props: { tone, index: "01" },
                  children: tone,
                },
              }),
            )}
          />
        </div>
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
            // s15-gallery-feedback — TextField's two demo states (plain,
            // with error) grouped into one preview row + one code block.
            {
              items: [
                {
                  snippet: {
                    component: "TextField",
                    props: {
                      label: labels.fieldLabelExample,
                      type: "email",
                      registration: { code: 'register("email")', value: {} },
                    },
                  },
                  // ESCAPE HATCH: TextField spreads a react-hook-form
                  // `registration` (incl. a `ref` callback) onto its
                  // <input> — React refuses that from a Server Component
                  // render pass. TextFieldDemo is the client boundary that
                  // makes it real; the snippet above is otherwise identical
                  // (see TextFieldDemo's own doc comment).
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
              ],
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

      <PrimitiveGroup name="ChartLine / ChartBar / ChartDonut">
        <ExampleGrid
          labels={exampleLabels}
          items={[
            {
              snippet: {
                component: "ChartLine",
                props: {
                  data: {
                    code: `[{ month: "${labels.chartCategoryJan}", visits: 120 }, { month: "${labels.chartCategoryFeb}", visits: 200 }, { month: "${labels.chartCategoryMar}", visits: 150 }]`,
                    value: [
                      { month: labels.chartCategoryJan, visits: 120 },
                      { month: labels.chartCategoryFeb, visits: 200 },
                      { month: labels.chartCategoryMar, visits: 150 },
                    ],
                  },
                  xKey: "month",
                  series: {
                    code: `[{ key: "visits", label: "${labels.chartSeriesVisits}" }]`,
                    value: [{ key: "visits", label: labels.chartSeriesVisits }],
                  },
                  height: 220,
                },
              },
              previewClassName: "w-full",
            },
            {
              snippet: {
                component: "ChartBar",
                props: {
                  data: {
                    code: `[{ quarter: "${labels.chartBarCategoryQ1}", signups: 80 }, { quarter: "${labels.chartBarCategoryQ2}", signups: 140 }, { quarter: "${labels.chartBarCategoryQ3}", signups: 110 }]`,
                    value: [
                      { quarter: labels.chartBarCategoryQ1, signups: 80 },
                      { quarter: labels.chartBarCategoryQ2, signups: 140 },
                      { quarter: labels.chartBarCategoryQ3, signups: 110 },
                    ],
                  },
                  xKey: "quarter",
                  series: {
                    code: `[{ key: "signups", label: "${labels.chartBarSeriesSignups}" }]`,
                    value: [
                      { key: "signups", label: labels.chartBarSeriesSignups },
                    ],
                  },
                  height: 220,
                },
              },
              previewClassName: "w-full",
            },
            {
              snippet: {
                component: "ChartDonut",
                props: {
                  data: {
                    code: `[{ key: "free", label: "${labels.chartDonutSliceFree}", value: 55 }, { key: "pro", label: "${labels.chartDonutSlicePro}", value: 35 }, { key: "enterprise", label: "${labels.chartDonutSliceEnterprise}", value: 10 }]`,
                    value: [
                      {
                        key: "free",
                        label: labels.chartDonutSliceFree,
                        value: 55,
                      },
                      {
                        key: "pro",
                        label: labels.chartDonutSlicePro,
                        value: 35,
                      },
                      {
                        key: "enterprise",
                        label: labels.chartDonutSliceEnterprise,
                        value: 10,
                      },
                    ],
                  },
                  height: 220,
                },
              },
              previewClassName: "w-full",
            },
          ]}
        />
      </PrimitiveGroup>

      <PrimitiveGroup name="Combobox">
        <div className="mt-4">
          <GroupedExample
            labels={exampleLabels}
            // s15-gallery-feedback (follow-up) — every item below opens its
            // own popup by default (`defaultOpen: true`); `Combobox`'s
            // listbox is `position: absolute` (combobox.tsx), so it does
            // not push the CodeDisclosure footer down and instead overlaid
            // it. Kept `defaultOpen` (see combobox.tsx's own comment: it is
            // the only way an accessible, role="option"-bearing listbox
            // shows up in this repo's served-HTML-only test tooling) and
            // reserved bottom padding instead.
            //
            // `pb-40` (160px) is sized for what the demo actually renders
            // today — at most 3 `role="option"` rows (~122px) — NOT for
            // `combobox.tsx`'s `max-h-60` bound (240px), which this reserve
            // does not cover. Pinned by
            // combobox-popup-room.test.ts's option-count guard: it fails if
            // a demo item's option list grows past 3, so this padding can
            // never silently stop being enough.
            previewClassName="pb-40"
            items={[
              {
                snippet: {
                  component: "Combobox",
                  props: {
                    label: labels.comboboxLabel,
                    placeholder: labels.comboboxPlaceholder,
                    // Forced open (no query) so the served DOM carries a
                    // populated, role="option"-bearing listbox by default —
                    // real usage opens on focus/typing instead.
                    defaultOpen: true,
                    emptyLabel: labels.comboboxEmptyLabel,
                    resultsLabel: labels.comboboxResultsLabel,
                    options: {
                      code: `[{ value: "fr", label: "${labels.comboboxOptionFrance}" }, { value: "de", label: "${labels.comboboxOptionGermany}" }, { value: "es", label: "${labels.comboboxOptionSpain}" }]`,
                      value: [
                        { value: "fr", label: labels.comboboxOptionFrance },
                        { value: "de", label: labels.comboboxOptionGermany },
                        { value: "es", label: labels.comboboxOptionSpain },
                      ],
                    },
                  },
                },
              },
              {
                snippet: {
                  component: "Combobox",
                  props: {
                    label: labels.comboboxLabel,
                    placeholder: labels.disabledLabel,
                    disabled: true,
                    emptyLabel: labels.comboboxEmptyLabel,
                    resultsLabel: labels.comboboxResultsLabel,
                    options: {
                      code: `[{ value: "fr", label: "${labels.comboboxOptionFrance}" }]`,
                      value: [
                        { value: "fr", label: labels.comboboxOptionFrance },
                      ],
                    },
                  },
                },
              },
              {
                snippet: {
                  component: "Combobox",
                  props: {
                    label: labels.comboboxLabel,
                    placeholder: labels.comboboxPlaceholder,
                    defaultOpen: true,
                    defaultQuery: labels.comboboxNoMatchQuery,
                    emptyLabel: labels.comboboxEmptyLabel,
                    resultsLabel: labels.comboboxResultsLabel,
                    options: {
                      code: `[{ value: "fr", label: "${labels.comboboxOptionFrance}" }, { value: "de", label: "${labels.comboboxOptionGermany}" }, { value: "es", label: "${labels.comboboxOptionSpain}" }]`,
                      value: [
                        { value: "fr", label: labels.comboboxOptionFrance },
                        { value: "de", label: labels.comboboxOptionGermany },
                        { value: "es", label: labels.comboboxOptionSpain },
                      ],
                    },
                  },
                },
              },
            ]}
          />
        </div>
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

/**
 * s15-gallery-feedback (annotation mtit5cqcr4q) — Card's realistic example
 * body: a kicker, a title, a line of body copy (compare StatCard, which
 * already reads instantly for the same reason). `Title`/`Text`/
 * `SectionLabel` set their own `text-*` token classes rather than
 * inheriting `Card`'s colour, so on `Card`'s dark (`pine`) variant they
 * need an explicit override — `text-paper`, the exact class card.tsx's own
 * `pine` variant already declares (`variants.pine` in card.tsx), not a new
 * token. No new component: composes the same three primitives every other
 * variant uses.
 */
function cardExampleChildren(
  kicker: string,
  onDark: boolean,
  labels: PrimitivesLabels,
): Snippet[] {
  return [
    {
      component: "SectionLabel",
      props: onDark ? { className: "text-paper/70" } : {},
      children: kicker,
    },
    {
      component: "Title",
      props: onDark ? { as: "h4", className: "text-paper" } : { as: "h4" },
      children: labels.cardExampleTitle,
    },
    {
      component: "Text",
      props: onDark
        ? { size: "xs", className: "text-paper/70" }
        : { size: "xs" },
      children: labels.cardExampleBody,
    },
  ]
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
      {items.map((item, i) => {
        if ("items" in item) {
          return (
            <GroupedExample
              key={i}
              items={item.items}
              labels={labels}
              previewClassName={item.previewClassName}
            />
          )
        }
        // Destructured to `render` so the JSX below reads `render={render}`
        // — the literal forwarding shape escape-hatch.test.ts's negative
        // lookahead already exempts (it forwards an already-resolved value
        // under the same name; not a new escape hatch).
        const { snippet, render, previewClassName } = item
        return (
          <Example
            key={i}
            snippet={snippet}
            labels={labels}
            render={render}
            previewClassName={previewClassName}
          />
        )
      })}
    </div>
  )
}
