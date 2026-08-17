import { describe, it, expect } from "vitest"
import fr from "./fr.json"
import en from "./en.json"

// Aplatit un objet de messages en un ensemble de chemins de clés ("a.b.c").
function flatKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const out: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out.push(...flatKeys(value as Record<string, unknown>, path))
    } else {
      out.push(path)
    }
  }
  return out
}

describe("i18n messages — parité fr/en", () => {
  it("fr et en exposent exactement les mêmes namespaces", () => {
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort())
  })

  it("fr et en exposent exactement les mêmes clés (aucune manquante d'un côté)", () => {
    const frKeys = new Set(flatKeys(fr as Record<string, unknown>))
    const enKeys = new Set(flatKeys(en as Record<string, unknown>))

    const missingInEn = [...frKeys].filter((k) => !enKeys.has(k))
    const missingInFr = [...enKeys].filter((k) => !frKeys.has(k))

    expect(missingInEn).toEqual([])
    expect(missingInFr).toEqual([])
  })
})
