import { describe, it, expect } from "vitest"
import fr from "./fr.json"
import en from "./en.json"

// T1 (s18-ui-kit-polish, annotation `mtlqrtxmkid` — "Renomme UI Kit") — the
// gallery's nav label and page title both read "Galerie de composants" /
// "Component gallery", a name nobody who actually uses the tool calls it by.
// Both surfaces (the sidebar nav entry AND the /ui page's own <h1>, which
// share the same string) render "UI Kit" now, in both locales — an English
// loanword kept identical fr/en, the same way this repo already keeps
// "Avatar" untranslated (see messages/coverage.test.ts's GALLERY_KEYS
// comment trail for the convention of pinning gallery copy here).
//
// FORBIDDEN, not just "the new value is right": a rename that only touches
// one of the two occurrences (nav OR page title) is worse than no rename —
// this fails on EITHER string still reading the old name, not just on the
// new one being absent.
const OLD_NAMES = /galerie de composants|component gallery/i

type Msgs = { appNav: { gallery: string }; gallery: { title: string } }

describe("gallery rename — 'UI Kit' replaces 'Galerie de composants' / 'Component gallery' (s18-ui-kit-polish T1)", () => {
  it("fr: nav entry and page title both read 'UI Kit'", () => {
    const msgs = fr as Msgs
    expect(msgs.appNav.gallery).toBe("UI Kit")
    expect(msgs.gallery.title).toBe("UI Kit")
  })

  it("en: nav entry and page title both read 'UI Kit'", () => {
    const msgs = en as Msgs
    expect(msgs.appNav.gallery).toBe("UI Kit")
    expect(msgs.gallery.title).toBe("UI Kit")
  })

  it("neither locale's JSON source still contains the old name anywhere", () => {
    expect(JSON.stringify(fr)).not.toMatch(OLD_NAMES)
    expect(JSON.stringify(en)).not.toMatch(OLD_NAMES)
  })
})
