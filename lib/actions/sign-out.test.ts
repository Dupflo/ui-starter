import { describe, it, expect, vi, beforeEach } from "vitest"

// Mirror du pattern settings.test.ts : on mock @/lib/supabase/server avant
// d'importer l'action pour isoler totalement la couche Supabase.
const signOut = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signOut } }),
}))

import { signOutAction } from "./sign-out"

// AC3 — "Logout clears the session" (côté serveur, ce qui fait autorité).
// On pin deux contrats documentés dans le fichier source :
//   (a) signOut est appelé avec { scope: "local" } (cookie SSR effacé localement)
//   (b) l'action se résout void même si l'appel Supabase rejette
//       (le cookie est purgé par le client SSR avant même que Supabase ne réponde)
describe("signOutAction — AC3 session-clear contract", () => {
  beforeEach(() => {
    signOut.mockReset()
  })

  it("appelle signOut avec { scope: 'local' }", async () => {
    signOut.mockResolvedValue({ error: null })
    await signOutAction()
    expect(signOut).toHaveBeenCalledOnce()
    expect(signOut).toHaveBeenCalledWith({ scope: "local" })
  })

  it("se résout void quand signOut rejette (la bite — cookie purgé localement même si Supabase échoue)", async () => {
    signOut.mockRejectedValue(new Error("network failure"))
    // L'action ne doit pas propager l'exception : elle se résout void.
    await expect(signOutAction()).resolves.toBeUndefined()
  })
})
