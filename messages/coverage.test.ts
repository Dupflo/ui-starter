/**
 * messages/coverage.test.ts — per-namespace key presence guarantee (s08-i18n AC2).
 *
 * PURPOSE
 * The deep parity test (messages.test.ts) proves fr and en agree with each
 * other. It does NOT prove that every key a t("…") call references actually
 * exists in the JSON. A key absent from BOTH locales would pass parity yet
 * render the raw key at runtime. This file closes that gap for every delivered
 * namespace not already pinned by auth.test.ts / legal.test.ts.
 *
 * APPROACH
 * Per-namespace enumerated presence tests, mirroring auth.test.ts / legal.test.ts:
 * for each namespace, a const array lists the keys the delivered screens
 * reference. The test asserts each key exists in fr AND en. Dynamic pricing
 * keys (resolved via plan.nameKey / plan.priceLabelKey / plan.featuresKey in
 * app/[locale]/page.tsx) are pinned by hand.
 *
 * NAMESPACES COVERED HERE
 * - metadata, appNav, cookieBanner, dashboard, forgot, newPassword,
 *   localeSwitcher, settings, home, pricing, admin, demo
 * (auth and legal are covered by their own test files)
 *
 * AC3 NOTE (persistence — no code, no test)
 * Locale persistence is delivered by:
 *   - localePrefix: "as-needed" in i18n/routing.ts  (fr unprefixed, en → /en)
 *   - NEXT_LOCALE cookie set by the next-intl middleware in proxy.ts
 *   - router.replace(pathname, { locale }) in LocaleMenu / LocaleSwitcher
 * This is infrastructure that already shipped before s08. No test boots the
 * middleware; persistence is out of scope for this story.
 */

import { describe, it, expect } from "vitest"
import fr from "./fr.json"
import en from "./en.json"

// Helpers ─────────────────────────────────────────────────────────────────────

type Msgs = Record<string, Record<string, string>>

function assertKeys(
  namespace: string,
  keys: readonly string[],
  locale: string,
  msgs: Msgs,
) {
  const ns = msgs[namespace]
  for (const key of keys) {
    expect(ns, `${namespace}.${key} missing in ${locale}`).toHaveProperty(key)
  }
}

// ─── metadata ────────────────────────────────────────────────────────────────
// app/[locale]/layout.tsx → generateMetadata
const METADATA_KEYS = ["title", "description"] as const

// ─── appNav ──────────────────────────────────────────────────────────────────
// components/app/app-sidebar.tsx, dark-mode-toggle.tsx
const APP_NAV_KEYS = [
  "dashboard",
  "settings",
  "collapse",
  "expand",
  "logout",
  "themeDark",
  "themeLight",
  "accountFallback",
] as const

// ─── cookieBanner ────────────────────────────────────────────────────────────
// components/app/cookie-banner.tsx
const COOKIE_BANNER_KEYS = ["aria", "body", "accept", "refuse"] as const

// ─── dashboard ───────────────────────────────────────────────────────────────
// app/[locale]/(app)/dashboard/page.tsx
const DASHBOARD_KEYS = ["greeting", "subtitle"] as const

// ─── forgot ──────────────────────────────────────────────────────────────────
// app/[locale]/mot-de-passe-oublie/page.tsx
const FORGOT_KEYS = [
  "title",
  "subtitle",
  "cta",
  "sentTitle",
  "sentBody",
  "backToLogin",
] as const

// ─── newPassword ─────────────────────────────────────────────────────────────
// app/[locale]/nouveau-mot-de-passe/page.tsx
const NEW_PASSWORD_KEYS = [
  "title",
  "subtitle",
  "passwordLabel",
  "cta",
  "error",
] as const

// ─── localeSwitcher ──────────────────────────────────────────────────────────
// components/ui/locale-menu.tsx (mounted on landing + auth-shell — s08)
const LOCALE_SWITCHER_KEYS = ["label"] as const

// ─── settings ────────────────────────────────────────────────────────────────
// components/app/settings-form.tsx
const SETTINGS_KEYS = [
  "profile",
  "fullName",
  "save",
  "saved",
  "saveError",
  "security",
  "currentPassword",
  "newPassword",
  "confirmPassword",
  "passwordMismatch",
  "updatePassword",
  "passwordChanged",
  "passwordWrongCurrent",
  "passwordNoAccount",
  "preferences",
  "interfaceLanguage",
  "account",
  "logout",
  "logoutNote",
  "deleteAccount",
  "deleteAccountNote",
  "cancel",
  "deleteConfirm",
  "deleteModalBody",
  "deleteConfirmEmail",
  "deleteError",
] as const

// ─── home ────────────────────────────────────────────────────────────────────
// app/[locale]/page.tsx (landing)
const HOME_KEYS = [
  "title",
  "subtitle",
  "cta",
  "pricingTitle",
  "closingTitle",
  "closingCta",
] as const

// ─── pricing ─────────────────────────────────────────────────────────────────
// app/[locale]/pricing/page.tsx + app/[locale]/page.tsx (landing)
// Dynamic keys from PLANS in lib/stripe/config.ts:
//   PLANS[0].nameKey       = "planProName"
//   PLANS[0].priceLabelKey = "planProPrice"
//   PLANS[0].featuresKey   = "planProFeatures"
const PRICING_KEYS = [
  "title",
  "subtitle",
  // Dynamic plan keys pinned by hand (plan.nameKey / plan.priceLabelKey / plan.featuresKey)
  "planProName",
  "planProPrice",
  "planProFeatures",
  "subscribe",
  "subscribePending",
  "loginMessage",
  "premiumTitle",
  "premiumSubtitle",
  "dashboard",
] as const

// ─── admin ───────────────────────────────────────────────────────────────────
// app/[locale]/(app)/admin/page.tsx
const ADMIN_KEYS = ["title", "subtitle"] as const

// ─── demo ────────────────────────────────────────────────────────────────────
// components/demo/demo-banner.tsx, demo-banner-controls.tsx (s11-demo-mode T6)
const DEMO_KEYS = [
  "badge",
  "notice",
  "emailLabel",
  "connect",
  "logout",
  "roleLabel",
  "roleUser",
  "roleAdmin",
  "subscribe",
  "unsubscribe",
  "reset",
] as const

// ─── gallery ─────────────────────────────────────────────────────────────────
// app/[locale]/ui/page.tsx, components/gallery/* (s12-ui-gallery T7)
const GALLERY_KEYS = [
  "title",
  "subtitle",
  "primitivesTitle",
  "blocksTitle",
  "copy",
  "copied",
  "disabledLabel",
  "errorExample",
  "fieldLabelExample",
  "containerPreview",
  "selectLabel",
  "selectOptionALabel",
  "selectOptionBLabel",
  "statLabelExample",
  "modalTrigger",
  "modalTitle",
  "modalBody",
  "lightboxTrigger",
  "lightboxCaption",
  "lightboxClose",
  "lightboxPrev",
  "lightboxNext",
  "localeCaption",
  "blockPageHeaderName",
  "blockPageHeaderTitle",
  "blockPageHeaderSubtitle",
  "blockPageHeaderCta",
  "blockPricingName",
  "blockPricingKicker",
  "blockPricingBadge",
  "blockPricingTitle",
  "blockPricingPrice",
  "blockPricingCta",
  "blockFormName",
  "blockFormTitle",
  "blockFormEmailLabel",
  "blockFormPasswordLabel",
  "blockFormCta",
  "blockEmptyName",
  "blockEmptyTitle",
  "blockEmptyBody",
  "blockEmptyCta",
  "blockStatRowName",
  "blockStatLabel1",
  "blockStatLabel2",
  "blockStatLabel3",
] as const

// ─── Tests ───────────────────────────────────────────────────────────────────

const NAMESPACE_FIXTURES: Array<{
  ns: string
  keys: readonly string[]
}> = [
  { ns: "metadata", keys: METADATA_KEYS },
  { ns: "appNav", keys: APP_NAV_KEYS },
  { ns: "cookieBanner", keys: COOKIE_BANNER_KEYS },
  { ns: "dashboard", keys: DASHBOARD_KEYS },
  { ns: "forgot", keys: FORGOT_KEYS },
  { ns: "newPassword", keys: NEW_PASSWORD_KEYS },
  { ns: "localeSwitcher", keys: LOCALE_SWITCHER_KEYS },
  { ns: "settings", keys: SETTINGS_KEYS },
  { ns: "home", keys: HOME_KEYS },
  { ns: "pricing", keys: PRICING_KEYS },
  { ns: "admin", keys: ADMIN_KEYS },
  { ns: "demo", keys: DEMO_KEYS },
  { ns: "gallery", keys: GALLERY_KEYS },
]

for (const { ns, keys } of NAMESPACE_FIXTURES) {
  describe(`${ns} messages — key presence (fr + en)`, () => {
    it(`fr: exposes every ${ns} key used by the screens`, () => {
      assertKeys(ns, keys, "fr", fr as Msgs)
    })

    it(`en: exposes every ${ns} key used by the screens`, () => {
      assertKeys(ns, keys, "en", en as Msgs)
    })
  })
}
