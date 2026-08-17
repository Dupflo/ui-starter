import { describe, it, expect, vi, beforeEach } from "vitest"

// Mocks pour isoler l'action de Supabase / observability.
const getUser = vi.fn()
const upsert = vi.fn()
const from = vi.fn(() => ({ upsert }))

vi.mock("@/lib/supabase/server", () => ({
  getUser: () => getUser(),
  createClient: async () => ({ from }),
}))
vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({}),
}))
vi.mock("@/lib/observability", () => ({
  reportError: vi.fn(),
}))

import { updateSettingsProfile } from "./settings"

describe("updateSettingsProfile — result object", () => {
  beforeEach(() => {
    getUser.mockReset()
    upsert.mockReset()
  })

  it("renvoie { ok:false, error } sans session", async () => {
    getUser.mockResolvedValue(null)
    const res = await updateSettingsProfile({ fullName: "Ada Lovelace" })
    expect(res).toEqual({ ok: false, error: "unauthenticated" })
  })

  it("upsert profiles et renvoie { ok:true } quand connecté", async () => {
    getUser.mockResolvedValue({ id: "u1" })
    upsert.mockResolvedValue({ error: null })
    const res = await updateSettingsProfile({ fullName: "Ada Lovelace" })
    expect(res).toEqual({ ok: true })
    expect(from).toHaveBeenCalledWith("profiles")
    expect(upsert).toHaveBeenCalledWith(
      { id: "u1", display_name: "Ada Lovelace" },
      { onConflict: "id" },
    )
  })

  it("renvoie { ok:false, error } quand l'upsert échoue", async () => {
    getUser.mockResolvedValue({ id: "u1" })
    upsert.mockResolvedValue({ error: { message: "boom" } })
    const res = await updateSettingsProfile({ fullName: "Ada" })
    expect(res).toEqual({ ok: false, error: "failed" })
  })
})
