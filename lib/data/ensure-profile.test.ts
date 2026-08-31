import { describe, it, expect, vi, beforeEach } from "vitest"

// Mocks pour isoler ensure-profile.ts du client service-role.
const upsert = vi.fn()
const from = vi.fn(() => ({ upsert }))
vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({ from }),
}))

// s11-demo-mode T4 — demo swap mock.
const isDemoModeMock = vi.fn()
vi.mock("@/lib/demo/flag", () => ({ isDemoMode: () => isDemoModeMock() }))

import { ensureProfile } from "./ensure-profile"

describe("ensureProfile — chemin réel", () => {
  beforeEach(() => {
    upsert.mockReset()
    from.mockClear()
    isDemoModeMock.mockReset()
    isDemoModeMock.mockReturnValue(false)
  })

  it("upsert la ligne profiles via le client service-role", async () => {
    upsert.mockResolvedValue({ error: null })
    await ensureProfile("u1", { fullName: "Ada" })
    expect(from).toHaveBeenCalledWith("profiles")
    expect(upsert).toHaveBeenCalled()
  })
})

describe("ensureProfile — demo swap (T4)", () => {
  beforeEach(() => {
    upsert.mockReset()
    from.mockClear()
    isDemoModeMock.mockReset()
  })

  it("ne touche jamais le client service-role quand le flag est actif (ne pas affaiblir le guard server-only)", async () => {
    isDemoModeMock.mockReturnValue(true)
    await ensureProfile("ignored", { fullName: "ignored" })
    expect(from).not.toHaveBeenCalled()
  })
})
