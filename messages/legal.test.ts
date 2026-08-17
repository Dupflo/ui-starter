import { describe, it, expect } from "vitest"
import fr from "./fr.json"
import en from "./en.json"

// The legal starter pages are neutral placeholders wired through i18n. They
// must not leak the killed domain's branding, and each locale must carry its
// own copy of every page's body keys (the /en route bug was French Applyzi
// text served on English pages).
const FORBIDDEN = /applyzi|anywwwhere|contact@applyzi|crédits de bienvenue/i

const LEGAL_PAGE_KEYS = [
  "mentionsLegales",
  "cgv",
  "privacy",
  "cookies",
  "backHome",
  "placeholderNotice",
  "mentionsTitle",
  "mentionsUpdated",
  "cgvTitle",
  "cgvUpdated",
  "privacyTitle",
  "privacyUpdated",
  "cookiesTitle",
  "cookiesUpdated",
] as const

describe("legal messages — neutral placeholder, no killed-domain branding", () => {
  for (const [locale, msgs] of [
    ["fr", fr],
    ["en", en],
  ] as const) {
    const legal = (msgs as Record<string, Record<string, string>>).legal

    it(`${locale}: exposes every legal page body key`, () => {
      for (const key of LEGAL_PAGE_KEYS) {
        expect(legal, `legal.${key} missing in ${locale}`).toHaveProperty(key)
      }
    })

    it(`${locale}: carries no Applyzi/CV/credit branding`, () => {
      for (const [key, value] of Object.entries(legal)) {
        expect(
          FORBIDDEN.test(value),
          `legal.${key} in ${locale} leaks killed-domain branding: "${value}"`,
        ).toBe(false)
      }
    })
  }

  it("fr and en legal copy actually differ (no French text served on /en)", () => {
    const frLegal = (fr as Record<string, Record<string, string>>).legal
    const enLegal = (en as Record<string, Record<string, string>>).legal
    // A representative body string must be translated, not copied verbatim.
    expect(enLegal.placeholderNotice).not.toBe(frLegal.placeholderNotice)
  })
})
