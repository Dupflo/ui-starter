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
                modalTrigger: t("modalTrigger"),
                modalTitle: t("modalTitle"),
                modalBody: t("modalBody"),
                lightboxTrigger: t("lightboxTrigger"),
                lightboxCaption: t("lightboxCaption"),
                lightboxClose: t("lightboxClose"),
                lightboxPrev: t("lightboxPrev"),
                lightboxNext: t("lightboxNext"),
                localeCaption: t("localeCaption"),
              }}
            />

            <Title as="h2" className="mt-16 px-2">
              {t("blocksTitle")}
            </Title>
            <BlocksSection
              labels={{
                copy: t("copy"),
                copied: t("copied"),
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
              }}
            />
          </div>
        </GalleryThemeScope>
      </Container>
    </main>
  )
}
