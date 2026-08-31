import { describe, it, expect, vi, beforeEach } from "vitest"

const resetPasswordForEmail = vi.fn()
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      resetPasswordForEmail: (...args: unknown[]) =>
        resetPasswordForEmail(...args),
    },
  }),
}))

// s11-demo-mode T4 — demo swap mock.
const isDemoModeMock = vi.fn()
vi.mock("@/lib/demo/flag", () => ({ isDemoMode: () => isDemoModeMock() }))

import { requestPasswordReset } from "./password-reset"

describe("requestPasswordReset — chemin réel", () => {
  beforeEach(() => {
    resetPasswordForEmail.mockReset()
    isDemoModeMock.mockReset()
    isDemoModeMock.mockReturnValue(false)
  })

  it("appelle Supabase et renvoie toujours { ok:true } (anti-énumération)", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null })
    const res = await requestPasswordReset("ada@example.com")
    expect(res).toEqual({ ok: true })
    expect(resetPasswordForEmail).toHaveBeenCalledOnce()
  })
})

describe("requestPasswordReset — demo swap (T4)", () => {
  beforeEach(() => {
    resetPasswordForEmail.mockReset()
    isDemoModeMock.mockReset()
  })

  it("renvoie { ok:true } sans jamais appeler Supabase quand le flag est actif", async () => {
    isDemoModeMock.mockReturnValue(true)
    const res = await requestPasswordReset("visitor@example.com")
    expect(res).toEqual({ ok: true })
    expect(resetPasswordForEmail).not.toHaveBeenCalled()
  })
})
