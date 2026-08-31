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

// s11-demo-mode T4 — demo swap mocks.
const isDemoModeMock = vi.fn()
vi.mock("@/lib/demo/flag", () => ({ isDemoMode: () => isDemoModeMock() }))

const getDemoRoleMock = vi.fn()
const getDemoDisplayNameMock = vi.fn()
vi.mock("@/lib/demo/state", () => ({
  getDemoRole: () => getDemoRoleMock(),
  getDemoDisplayName: () => getDemoDisplayNameMock(),
}))

vi.mock("@/lib/demo/fixtures", () => ({
  DEMO_PROFILE: { avatar_url: null },
}))

import {
  initialsOf,
  getDisplayName,
  getAvatarUrl,
  getRole,
  isAdmin,
} from "./identity"

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

// ─── getRole — lecture serveur du rôle ───────────────────────────────────────

describe("getRole", () => {
  beforeEach(() => {
    maybeSingle.mockReset()
    from.mockClear()
    select.mockClear()
    eq.mockClear()
  })

  it("retourne 'admin' quand le profil a role = 'admin'", async () => {
    maybeSingle.mockResolvedValue({ data: { role: "admin" } })
    const result = await getRole("u1")
    expect(result).toBe("admin")
  })

  it("retourne 'user' quand le profil a role = 'user'", async () => {
    maybeSingle.mockResolvedValue({ data: { role: "user" } })
    const result = await getRole("u1")
    expect(result).toBe("user")
  })

  it("retourne 'user' (fail-safe) quand la ligne est absente (data: null)", async () => {
    maybeSingle.mockResolvedValue({ data: null })
    const result = await getRole("u1")
    expect(result).toBe("user")
  })

  it("retourne 'user' (fail-safe) quand role est null", async () => {
    maybeSingle.mockResolvedValue({ data: { role: null } })
    const result = await getRole("u1")
    expect(result).toBe("user")
  })
})

// ─── isAdmin — prédicat pur, gate decision ────────────────────────────────────

describe("isAdmin", () => {
  it("retourne true pour 'admin'", () => {
    expect(isAdmin("admin")).toBe(true)
  })

  it("retourne false pour 'user'", () => {
    expect(isAdmin("user")).toBe(false)
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

// ─── s11-demo-mode T4 — demo swap, les deux branches ──────────────────────────

describe("getDisplayName / getRole / getAvatarUrl — demo swap (T4)", () => {
  beforeEach(() => {
    maybeSingle.mockReset()
    from.mockClear()
    isDemoModeMock.mockReset()
    getDemoRoleMock.mockReset()
    getDemoDisplayNameMock.mockReset()
  })

  it("getDisplayName retourne l'état démo et ne touche jamais Supabase quand le flag est actif", async () => {
    isDemoModeMock.mockReturnValue(true)
    getDemoDisplayNameMock.mockReturnValue("Alex Démo")
    const result = await getDisplayName("ignored", {
      fullName: "ignored",
      email: "ignored@example.com",
    })
    expect(result).toBe("Alex Démo")
    expect(from).not.toHaveBeenCalled()
  })

  it("getDisplayName retombe sur le chemin réel quand le flag est absent", async () => {
    isDemoModeMock.mockReturnValue(false)
    maybeSingle.mockResolvedValue({ data: { display_name: "Ada Lovelace" } })
    const result = await getDisplayName("u1", {
      fullName: null,
      email: null,
    })
    expect(result).toBe("Ada Lovelace")
    expect(getDemoDisplayNameMock).not.toHaveBeenCalled()
  })

  it("getRole retourne le rôle démo et ne touche jamais Supabase quand le flag est actif", async () => {
    isDemoModeMock.mockReturnValue(true)
    getDemoRoleMock.mockReturnValue("admin")
    const result = await getRole("ignored")
    expect(result).toBe("admin")
    expect(from).not.toHaveBeenCalled()
  })

  it("getRole retombe sur le chemin réel quand le flag est absent", async () => {
    isDemoModeMock.mockReturnValue(false)
    maybeSingle.mockResolvedValue({ data: { role: "user" } })
    const result = await getRole("u1")
    expect(result).toBe("user")
    expect(getDemoRoleMock).not.toHaveBeenCalled()
  })

  it("getAvatarUrl retourne l'avatar démo (null) sans toucher Supabase quand le flag est actif", async () => {
    isDemoModeMock.mockReturnValue(true)
    const result = await getAvatarUrl("ignored")
    expect(result).toBeNull()
    expect(from).not.toHaveBeenCalled()
  })

  it("getAvatarUrl retombe sur le chemin réel quand le flag est absent", async () => {
    isDemoModeMock.mockReturnValue(false)
    maybeSingle.mockResolvedValue({
      data: { avatar_url: "https://example.com/a.png" },
    })
    const result = await getAvatarUrl("u1")
    expect(result).toBe("https://example.com/a.png")
  })
})
