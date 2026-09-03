import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Container } from "@/components/ui/container"
import { SectionLabel } from "@/components/ui/section-label"
import { Title } from "@/components/ui/title"
import { Text } from "@/components/ui/text"
import {
  GalleryThemeScope,
  GalleryThemeToggle,
} from "@/components/gallery/theme-toggle"
import { PrimitivesSection } from "@/components/gallery/primitives-section"
import { BlocksSection } from "@/components/gallery/blocks-section"
import { isGalleryVisible } from "@/lib/demo/flag"

// T6 (s12-ui-gallery) — visible in development and in demo mode only; a
// normal production build 404s it (human decision, docs/plans/s12-ui-gallery.md
// "Decisions taken": every SaaS forked from this starter would otherwise ship
// its own component gallery to real users).
//
// `isGalleryVisible()` (lib/demo/flag.ts) is the single implementation of
// this predicate — the sidebar nav link (components/app/app-sidebar.tsx)
// calls the same function, so the two cannot drift (follow-up to
// s12-ui-gallery, pinned by lib/demo/gallery-visibility.test.ts).

export default async function UiGalleryPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  if (!isGalleryVisible()) {
    notFound()
  }

  const t = await getTranslations("gallery")

  return (
    <main className="min-h-dvh bg-sand text-ink">
      <Container className="py-16">
        <SectionLabel index="00">{t("title")}</SectionLabel>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Title as="h1">{t("title")}</Title>
            <Text size="base" leading className="mt-2 max-w-prose">
              {t("subtitle")}
            </Text>
          </div>
        </div>

        <GalleryThemeScope>
          <div className="mt-6">
            <GalleryThemeToggle />
          </div>

          <div className="mt-4 rounded-2xl bg-sand p-2">
            <Title as="h2" className="px-2">
              {t("primitivesTitle")}
            </Title>
            <PrimitivesSection
              labels={{
                copy: t("copy"),
                copied: t("copied"),
                disabledLabel: t("disabledLabel"),
                errorExample: t("errorExample"),
                fieldLabelExample: t("fieldLabelExample"),
                containerPreview: t("containerPreview"),
                selectLabel: t("selectLabel"),
                selectOptionALabel: t("selectOptionALabel"),
                selectOptionBLabel: t("selectOptionBLabel"),
                statLabelExample: t("statLabelExample"),
                cardExampleTitle: t("cardExampleTitle"),
                cardExampleBody: t("cardExampleBody"),
                chartSeriesVisits: t("chartSeriesVisits"),
                chartCategoryJan: t("chartCategoryJan"),
                chartCategoryFeb: t("chartCategoryFeb"),
                chartCategoryMar: t("chartCategoryMar"),
                chartBarSeriesSignups: t("chartBarSeriesSignups"),
                chartBarCategoryQ1: t("chartBarCategoryQ1"),
                chartBarCategoryQ2: t("chartBarCategoryQ2"),
                chartBarCategoryQ3: t("chartBarCategoryQ3"),
                chartDonutSliceFree: t("chartDonutSliceFree"),
                chartDonutSlicePro: t("chartDonutSlicePro"),
                chartDonutSliceEnterprise: t("chartDonutSliceEnterprise"),
                comboboxLabel: t("comboboxLabel"),
                comboboxPlaceholder: t("comboboxPlaceholder"),
                comboboxEmptyLabel: t("comboboxEmptyLabel"),
                // t.raw(), not t(): the "{count}" placeholder is
                // interpolated inside Combobox itself (see its doc
                // comment), same convention as modalTriggerTemplate above.
                comboboxResultsLabel: t.raw("comboboxResultsLabel"),
                comboboxOptionFrance: t("comboboxOptionFrance"),
                comboboxOptionGermany: t("comboboxOptionGermany"),
                comboboxOptionSpain: t("comboboxOptionSpain"),
                comboboxNoMatchQuery: t("comboboxNoMatchQuery"),
                codeShow: t("codeShow"),
                codeHide: t("codeHide"),
                // t.raw(), not t(): the "{size}" placeholder is interpolated
                // client-side, once per Modal size (see ModalDemo's doc
                // comment for why the derivation lives there).
                modalTriggerTemplate: t.raw("modalTriggerFor"),
                modalTitle: t("modalTitle"),
                modalBody: t("modalBody"),
                lightboxTrigger: t("lightboxTrigger"),
                lightboxCaption: t("lightboxCaption"),
                lightboxCaptionAlt: t("lightboxCaptionAlt"),
                lightboxClose: t("lightboxClose"),
                lightboxPrev: t("lightboxPrev"),
                lightboxNext: t("lightboxNext"),
                localeCaption: t("localeCaption"),
                buttonDarkCaption: t("buttonDarkCaption"),
                buttonIconLabel: t("buttonIconLabel"),
                dataTableCaption: t("dataTableCaption"),
                dataTableColumnName: t("dataTableColumnName"),
                dataTableColumnEmail: t("dataTableColumnEmail"),
                dataTableColumnRole: t("dataTableColumnRole"),
                dataTableColumnSignups: t("dataTableColumnSignups"),
                dataTableColumnJoined: t("dataTableColumnJoined"),
                dataTableColumnPlan: t("dataTableColumnPlan"),
                dataTableLoadingLabel: t("dataTableLoadingLabel"),
                dataTableEmptyLabel: t("dataTableEmptyLabel"),
                dataTablePreviousLabel: t("dataTablePreviousLabel"),
                dataTableNextLabel: t("dataTableNextLabel"),
                // t.raw(), not t(): the "{page}"/"{total}" placeholders are
                // interpolated inside DataTable itself (see its doc
                // comment, same convention as comboboxResultsLabel above).
                dataTablePageOfTemplate: t.raw("dataTablePageOfTemplate"),
                dataTableRow1Name: t("dataTableRow1Name"),
                dataTableRow1Email: t("dataTableRow1Email"),
                dataTableRow1Role: t("dataTableRow1Role"),
                dataTableRow1Plan: t("dataTableRow1Plan"),
                dataTableRow2Name: t("dataTableRow2Name"),
                dataTableRow2Email: t("dataTableRow2Email"),
                dataTableRow2Role: t("dataTableRow2Role"),
                dataTableRow2Plan: t("dataTableRow2Plan"),
                dataTableRow3Name: t("dataTableRow3Name"),
                dataTableRow3Email: t("dataTableRow3Email"),
                dataTableRow3Role: t("dataTableRow3Role"),
                dataTableRow3Plan: t("dataTableRow3Plan"),
                dataTableRow4Name: t("dataTableRow4Name"),
                dataTableRow4Email: t("dataTableRow4Email"),
                dataTableRow4Role: t("dataTableRow4Role"),
                dataTableRow4Plan: t("dataTableRow4Plan"),
                actionMenuLabel: t("actionMenuLabel"),
                actionMenuEdit: t("actionMenuEdit"),
                actionMenuArchive: t("actionMenuArchive"),
                actionMenuDelete: t("actionMenuDelete"),
              }}
            />

            <Title as="h2" className="mt-16 px-2">
              {t("blocksTitle")}
            </Title>
            <BlocksSection
              labels={{
                copy: t("copy"),
                copied: t("copied"),
                codeShow: t("codeShow"),
                codeHide: t("codeHide"),
                pageHeaderName: t("blockPageHeaderName"),
                pricingName: t("blockPricingName"),
                formName: t("blockFormName"),
                emptyName: t("blockEmptyName"),
                statRowName: t("blockStatRowName"),
                pageHeaderTitle: t("blockPageHeaderTitle"),
                pageHeaderSubtitle: t("blockPageHeaderSubtitle"),
                pageHeaderCta: t("blockPageHeaderCta"),
                pricingKicker: t("blockPricingKicker"),
                pricingBadge: t("blockPricingBadge"),
                pricingTitle: t("blockPricingTitle"),
                pricingPrice: t("blockPricingPrice"),
                pricingCta: t("blockPricingCta"),
                formTitle: t("blockFormTitle"),
                formEmailLabel: t("blockFormEmailLabel"),
                formPasswordLabel: t("blockFormPasswordLabel"),
                formCta: t("blockFormCta"),
                emptyTitle: t("blockEmptyTitle"),
                emptyBody: t("blockEmptyBody"),
                emptyCta: t("blockEmptyCta"),
                statLabel1: t("blockStatLabel1"),
                statLabel2: t("blockStatLabel2"),
                statLabel3: t("blockStatLabel3"),
                usersName: t("blockUsersName"),
                usersLabels: {
                  caption: t("usersCaption"),
                  columnAvatar: t("usersColumnAvatar"),
                  columnUser: t("usersColumnUser"),
                  columnRole: t("usersColumnRole"),
                  columnStatus: t("usersColumnStatus"),
                  columnActions: t("usersColumnActions"),
                  actionView: t("usersActionView"),
                  actionEdit: t("usersActionEdit"),
                  actionDelete: t("usersActionDelete"),
                  // t.raw(), not t(): the "{name}" placeholder is
                  // interpolated per row inside DataTableUsersDemo itself
                  // (same convention as dataTablePageOfTemplate above).
                  actionsLabelTemplate: t.raw("usersActionsLabelTemplate"),
                  row1Name: t("usersRow1Name"),
                  row1Role: t("usersRow1Role"),
                  row1Status: t("usersRow1Status"),
                  row2Name: t("usersRow2Name"),
                  row2Role: t("usersRow2Role"),
                  row2Status: t("usersRow2Status"),
                  row3Name: t("usersRow3Name"),
                  row3Role: t("usersRow3Role"),
                  row3Status: t("usersRow3Status"),
                  row4Name: t("usersRow4Name"),
                  row4Role: t("usersRow4Role"),
                  row4Status: t("usersRow4Status"),
                  // Reuses the same generic pagination/loading/empty copy
                  // as the DataTable primitive demo above (dataTable*) —
                  // not content specific to this composition.
                  loadingLabel: t("dataTableLoadingLabel"),
                  emptyLabel: t("dataTableEmptyLabel"),
                  previousLabel: t("dataTablePreviousLabel"),
                  nextLabel: t("dataTableNextLabel"),
                  pageOfTemplate: t.raw("dataTablePageOfTemplate"),
                },
              }}
            />
          </div>
        </GalleryThemeScope>
      </Container>
    </main>
  )
}
