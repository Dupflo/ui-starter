import { describe, it, expect, vi, beforeEach } from "vitest"

// Mocks pour isoler dashboard.ts de Supabase (pattern: identity.test.ts).
const maybeSingle = vi.fn()
const eq = vi.fn(() => ({ maybeSingle }))
const select = vi.fn(() => ({ eq }))
const from = vi.fn(() => ({ select }))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from }),
}))

// s11-demo-mode T4 — demo swap mocks.
const isDemoModeMock = vi.fn()
vi.mock("@/lib/demo/flag", () => ({ isDemoMode: () => isDemoModeMock() }))

const getDemoDisplayNameMock = vi.fn()
vi.mock("@/lib/demo/state", () => ({
  getDemoDisplayName: () => getDemoDisplayNameMock(),
}))

import { loadDashboard } from "./dashboard"

describe("loadDashboard — chemin réel", () => {
  beforeEach(() => {
    maybeSingle.mockReset()
    from.mockClear()
    isDemoModeMock.mockReset()
    isDemoModeMock.mockReturnValue(false)
  })

  it("retourne displayName depuis le profil", async () => {
    maybeSingle.mockResolvedValue({ data: { display_name: "Ada Lovelace" } })
    const result = await loadDashboard("u1")
    expect(result).toEqual({ displayName: "Ada Lovelace" })
  })

  it("retourne une chaîne vide si le profil est absent", async () => {
    maybeSingle.mockResolvedValue({ data: null })
    const result = await loadDashboard("u1")
    expect(result).toEqual({ displayName: "" })
  })
})

describe("loadDashboard — demo swap (T4)", () => {
  beforeEach(() => {
    maybeSingle.mockReset()
    from.mockClear()
    isDemoModeMock.mockReset()
    getDemoDisplayNameMock.mockReset()
  })

  it("retourne le nom démo sans toucher Supabase quand le flag est actif", async () => {
    isDemoModeMock.mockReturnValue(true)
    getDemoDisplayNameMock.mockReturnValue("Alex Démo")
    const result = await loadDashboard("ignored")
    expect(result).toEqual({ displayName: "Alex Démo" })
    expect(from).not.toHaveBeenCalled()
  })
})
