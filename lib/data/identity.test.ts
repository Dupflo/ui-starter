import { describe, it, expect, vi, beforeEach } from "vitest"

// Mocks pour isoler identity.ts de Supabase (pattern: settings.test.ts).
const maybeSingle = vi.fn()
const eq = vi.fn(() => ({ maybeSingle }))
const select = vi.fn(() => ({ eq }))
const from = vi.fn(() => ({ select }))

vi.mock("@/lib/supabase/server", () => ({
  getUser: vi.fn(),
  createClient: async () => ({ from }),
}))

import { initialsOf, getDisplayName } from "./identity"

// ─── initialsOf — pure function, aucun mock nécessaire ───────────────────────

describe("initialsOf", () => {
  it("retourne '?' pour null", () => {
    expect(initialsOf(null)).toBe("?")
  })

  it("retourne '?' pour une chaîne vide ou uniquement des espaces", () => {
    expect(initialsOf("")).toBe("?")
    expect(initialsOf("   ")).toBe("?")
  })

  it("retourne les deux premières lettres en majuscules pour un seul mot", () => {
    expect(initialsOf("Ada")).toBe("AD")
  })

  it("retourne initiale-du-premier + initiale-du-dernier mot pour deux mots et plus", () => {
    expect(initialsOf("Ada Lovelace")).toBe("AL")
    expect(initialsOf("Jean Claude Durand")).toBe("JD")
  })
})

// ─── getDisplayName — chaîne de fallback ─────────────────────────────────────

describe("getDisplayName — fallback chain", () => {
  beforeEach(() => {
    maybeSingle.mockReset()
    from.mockClear()
    select.mockClear()
    eq.mockClear()
  })

  it("retourne le display_name du profil quand il existe", async () => {
    maybeSingle.mockResolvedValue({ data: { display_name: "Ada Lovelace" } })
    const result = await getDisplayName("u1", {
      fullName: "Backup Name",
      email: "ada@example.com",
    })
    expect(result).toBe("Ada Lovelace")
  })

  it("repli sur meta.fullName quand display_name est absent", async () => {
    maybeSingle.mockResolvedValue({ data: { display_name: null } })
    const result = await getDisplayName("u1", {
      fullName: "Grace Hopper",
      email: "grace@example.com",
    })
    expect(result).toBe("Grace Hopper")
  })

  it("repli sur la partie locale de l'email quand display_name et fullName sont absents", async () => {
    maybeSingle.mockResolvedValue({ data: { display_name: null } })
    const result = await getDisplayName("u1", {
      fullName: null,
      email: "ada@example.com",
    })
    expect(result).toBe("ada")
  })

  it("retourne null quand rien n'est disponible", async () => {
    maybeSingle.mockResolvedValue({ data: null })
    const result = await getDisplayName("u1", {
      fullName: null,
      email: null,
    })
    expect(result).toBeNull()
  })
})
