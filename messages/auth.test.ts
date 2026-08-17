import { describe, it, expect } from "vitest"
import fr from "./fr.json"
import en from "./en.json"

// Mirror de legal.test.ts : parity fr/en sur l'espace de noms `auth`, pas de
// fuite de la marque du domaine tué (Applyzi/CV).
// Un key manquant = erreur silencieuse au runtime (les formulaires résolvent les
// clés à l'exécution — une clé absente affiche la clé brute sans planter).
const FORBIDDEN = /applyzi|anywwwhere|contact@applyzi|crédits de bienvenue/i

// Toutes les clés que les formulaires auth appellent (login-form, signup-form,
// google-button, schemas.ts) ou que la page affiche (forgot, auth-shell footer).
const AUTH_KEYS = [
  "loginTitle",
  "loginSubtitle",
  "google",
  "or",
  "email",
  "password",
  "name",
  "loginCta",
  "loginPending",
  "signupCta",
  "noAccount",
  "signupLink",
  "hasAccount",
  "loginLink",
  "signupTitle",
  "signupSubtitle",
  "footer",
  "authErrorEmail",
  "authErrorInvalid",
  "authErrorRequired",
  "authErrorPassword",
  "authErrorEmailTaken",
  "authErrorSignup",
  "authErrorConfirmEmail",
  "forgotLink",
] as const

describe("auth messages — key presence, parity, no killed-domain branding", () => {
  for (const [locale, msgs] of [
    ["fr", fr],
    ["en", en],
  ] as const) {
    const auth = (msgs as Record<string, Record<string, string>>).auth

    it(`${locale}: exposes every auth key used by the forms`, () => {
      for (const key of AUTH_KEYS) {
        expect(auth, `auth.${key} missing in ${locale}`).toHaveProperty(key)
      }
    })

    it(`${locale}: carries no Applyzi/CV/credit branding`, () => {
      for (const [key, value] of Object.entries(auth)) {
        expect(
          FORBIDDEN.test(value),
          `auth.${key} in ${locale} leaks killed-domain branding: "${value}"`,
        ).toBe(false)
      }
    })
  }

  it("fr and en auth key sets are identical (parity — no missing translation)", () => {
    const frAuth = (fr as Record<string, Record<string, string>>).auth
    const enAuth = (en as Record<string, Record<string, string>>).auth
    const frKeys = new Set(Object.keys(frAuth))
    const enKeys = new Set(Object.keys(enAuth))
    const missingInEn = [...frKeys].filter((k) => !enKeys.has(k))
    const missingInFr = [...enKeys].filter((k) => !frKeys.has(k))
    expect(missingInEn, "keys in fr but not en").toEqual([])
    expect(missingInFr, "keys in en but not fr").toEqual([])
  })
})
