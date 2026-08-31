import { describe, it, expect, vi, beforeEach } from "vitest"

// Mocks pour isoler l'action de Supabase / observability.
const getUser = vi.fn()
const upsert = vi.fn()
const from = vi.fn(() => ({ upsert }))
const signInWithPassword = vi.fn()
const updateUser = vi.fn()
const authSignOut = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  getUser: () => getUser(),
  createClient: async () => ({
    from,
    auth: {
      signInWithPassword: (...args: unknown[]) => signInWithPassword(...args),
      updateUser: (...args: unknown[]) => updateUser(...args),
      signOut: (...args: unknown[]) => authSignOut(...args),
    },
  }),
}))

const deleteUser = vi.fn()
vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    auth: {
      admin: { deleteUser: (...args: unknown[]) => deleteUser(...args) },
    },
  }),
}))
vi.mock("@/lib/observability", () => ({
  reportError: vi.fn(),
}))

// s11-demo-mode T4 — demo swap mocks.
const isDemoModeMock = vi.fn()
vi.mock("@/lib/demo/flag", () => ({ isDemoMode: () => isDemoModeMock() }))

const setDemoDisplayNameMock = vi.fn()
const demoSignOutMock = vi.fn()
vi.mock("@/lib/demo/state", () => ({
  setDemoDisplayName: (name: string) => setDemoDisplayNameMock(name),
  demoSignOut: () => demoSignOutMock(),
}))

import {
  updateSettingsProfile,
  changePassword,
  deleteAccount,
} from "./settings"

describe("updateSettingsProfile — result object", () => {
  beforeEach(() => {
    getUser.mockReset()
    upsert.mockReset()
    isDemoModeMock.mockReset()
    isDemoModeMock.mockReturnValue(false)
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

// ─── s11-demo-mode T4 — demo swap, les deux branches ──────────────────────────

describe("updateSettingsProfile — demo swap (T4)", () => {
  beforeEach(() => {
    getUser.mockReset()
    upsert.mockReset()
    from.mockClear()
    isDemoModeMock.mockReset()
    setDemoDisplayNameMock.mockReset()
  })

  it("met à jour l'état démo et ne touche jamais Supabase quand le flag est actif", async () => {
    isDemoModeMock.mockReturnValue(true)
    getUser.mockResolvedValue({ id: "demo-1" })
    const res = await updateSettingsProfile({ fullName: "Nouveau Nom" })
    expect(res).toEqual({ ok: true })
    expect(setDemoDisplayNameMock).toHaveBeenCalledWith("Nouveau Nom")
    expect(from).not.toHaveBeenCalled()
  })
})

describe("changePassword — chemin réel", () => {
  beforeEach(() => {
    getUser.mockReset()
    signInWithPassword.mockReset()
    updateUser.mockReset()
    isDemoModeMock.mockReset()
    isDemoModeMock.mockReturnValue(false)
  })

  it("renvoie { ok:false, reason:'wrong_current' } quand le mot de passe actuel est faux", async () => {
    getUser.mockResolvedValue({
      email: "ada@example.com",
      identities: [{ provider: "email" }],
    })
    signInWithPassword.mockResolvedValue({ error: { message: "bad" } })
    const res = await changePassword({ current: "wrong", next: "newpass1" })
    expect(res).toEqual({ ok: false, reason: "wrong_current" })
    expect(updateUser).not.toHaveBeenCalled()
  })

  it("renvoie { ok:false, reason:'no_password_account' } pour un compte Google-only", async () => {
    getUser.mockResolvedValue({ email: "ada@example.com", identities: [] })
    const res = await changePassword({ current: "x", next: "newpass1" })
    expect(res).toEqual({ ok: false, reason: "no_password_account" })
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  it("renvoie { ok:true } et appelle updateUser quand le mot de passe actuel est correct", async () => {
    getUser.mockResolvedValue({
      email: "ada@example.com",
      identities: [{ provider: "email" }],
    })
    signInWithPassword.mockResolvedValue({ error: null })
    updateUser.mockResolvedValue({ error: null })
    const res = await changePassword({ current: "right", next: "newpass1" })
    expect(res).toEqual({ ok: true })
    expect(updateUser).toHaveBeenCalledWith({ password: "newpass1" })
  })
})

describe("changePassword — demo swap (T4)", () => {
  beforeEach(() => {
    getUser.mockReset()
    signInWithPassword.mockReset()
    updateUser.mockReset()
    isDemoModeMock.mockReset()
  })

  it("refuse (aucun mot de passe réel à changer) sans jamais toucher Supabase quand le flag est actif — même si le fixture démo prétendait avoir une identité e-mail", async () => {
    isDemoModeMock.mockReturnValue(true)
    // Identité "email" présente à dessein : sans le court-circuit démo, le
    // chemin réel appellerait signInWithPassword (non mocké ici -> throw) —
    // ce test ne passe que si le swap intercepte AVANT ce point.
    getUser.mockResolvedValue({
      email: "demo@example.com",
      identities: [{ provider: "email" }],
    })
    const res = await changePassword({ current: "x", next: "newpass1" })
    expect(res).toEqual({ ok: false, reason: "no_password_account" })
    expect(signInWithPassword).not.toHaveBeenCalled()
    expect(updateUser).not.toHaveBeenCalled()
  })
})

describe("deleteAccount — chemin réel", () => {
  beforeEach(() => {
    getUser.mockReset()
    deleteUser.mockReset()
    authSignOut.mockReset()
    isDemoModeMock.mockReset()
    isDemoModeMock.mockReturnValue(false)
  })

  it("renvoie { ok:false, reason:'email_mismatch' } si l'e-mail retapé ne correspond pas", async () => {
    getUser.mockResolvedValue({ id: "u1", email: "ada@example.com" })
    const res = await deleteAccount({ confirmEmail: "wrong@example.com" })
    expect(res).toEqual({ ok: false, reason: "email_mismatch" })
    expect(deleteUser).not.toHaveBeenCalled()
  })

  it("supprime le compte via le service-role et renvoie { ok:true } quand l'e-mail correspond", async () => {
    getUser.mockResolvedValue({ id: "u1", email: "ada@example.com" })
    deleteUser.mockResolvedValue({ error: null })
    authSignOut.mockResolvedValue({ error: null })
    const res = await deleteAccount({ confirmEmail: "ada@example.com" })
    expect(res).toEqual({ ok: true })
    expect(deleteUser).toHaveBeenCalledWith("u1")
  })
})

describe("deleteAccount — demo swap (T4)", () => {
  beforeEach(() => {
    getUser.mockReset()
    deleteUser.mockReset()
    isDemoModeMock.mockReset()
    demoSignOutMock.mockReset()
  })

  it("mute l'état démo (déconnexion) au lieu d'appeler le service-role quand le flag est actif", async () => {
    isDemoModeMock.mockReturnValue(true)
    getUser.mockResolvedValue({ id: "demo-1", email: "demo@example.com" })
    const res = await deleteAccount({ confirmEmail: "demo@example.com" })
    expect(res).toEqual({ ok: true })
    expect(demoSignOutMock).toHaveBeenCalledOnce()
    expect(deleteUser).not.toHaveBeenCalled()
  })

  it("garde le contrôle de l'e-mail retapé même en démo", async () => {
    isDemoModeMock.mockReturnValue(true)
    getUser.mockResolvedValue({ id: "demo-1", email: "demo@example.com" })
    const res = await deleteAccount({ confirmEmail: "wrong@example.com" })
    expect(res).toEqual({ ok: false, reason: "email_mismatch" })
    expect(demoSignOutMock).not.toHaveBeenCalled()
  })
})
