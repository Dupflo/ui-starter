import { setRequestLocale, getTranslations } from "next-intl/server"
import { Container } from "@/components/ui/container"
import { Logo } from "@/components/brand/logo"
import { Link } from "@/i18n/navigation"

/**
 * Layout des pages légales (mentions légales, CGV, confidentialité, cookies).
 * Contenu neutre via i18n (fr/en) : placeholders à remplacer par l'exploitant.
 * Mise en page sobre, lisible, prose typée.
 */
export default async function LegalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("legal")

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="bg-pine print-hide">
        <Container className="flex items-center justify-between py-4">
          <Link href="/" aria-label={t("backHome")}>
            <Logo />
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-paper/75 transition-colors hover:text-paper"
          >
            {t("backHome")}
          </Link>
        </Container>
      </header>

      <Container className="py-12 md:py-16">
        <article className="mx-auto max-w-2xl">{children}</article>
        <nav className="mx-auto mt-16 flex max-w-2xl flex-wrap gap-x-5 gap-y-2 border-t border-line pt-6 text-xs text-muted print-hide">
          <Link href="/mentions-legales" className="hover:text-pine">
            {t("mentionsLegales")}
          </Link>
          <Link href="/cgv" className="hover:text-pine">
            {t("cgv")}
          </Link>
          <Link href="/confidentialite" className="hover:text-pine">
            {t("privacy")}
          </Link>
          <Link href="/cookies" className="hover:text-pine">
            {t("cookies")}
          </Link>
        </nav>
      </Container>
    </div>
  )
}
