import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

const isDemoModeMock = vi.fn()
vi.mock("@/lib/demo/flag", () => ({ isDemoMode: () => isDemoModeMock() }))

const demoSignInMock = vi.fn()
const setDemoRoleMock = vi.fn()
const setDemoSubscriptionActiveMock = vi.fn()
const resetDemoSessionMock = vi.fn()
vi.mock("@/lib/demo/state", () => ({
  demoSignIn: (email: string) => demoSignInMock(email),
  setDemoRole: (role: string) => setDemoRoleMock(role),
  setDemoSubscriptionActive: (active: boolean) =>
    setDemoSubscriptionActiveMock(active),
  resetDemoSession: () => resetDemoSessionMock(),
}))

import {
  demoLoginAction,
  demoSetRoleAction,
  demoSetSubscriptionAction,
  demoResetAction,
} from "./demo-controls"

// T6 (s11-demo-mode) — demo-only server actions. Fail-closed like every other
// seam: a no-op when the flag is off, so these can never mutate anything on
// a real deployment even if somehow invoked.

describe("demo-controls — fail-closed when demo mode is off", () => {
  beforeEach(() => {
    isDemoModeMock.mockReset()
    isDemoModeMock.mockReturnValue(false)
    demoSignInMock.mockReset()
    setDemoRoleMock.mockReset()
    setDemoSubscriptionActiveMock.mockReset()
    resetDemoSessionMock.mockReset()
  })

  it("demoLoginAction is a no-op", async () => {
    const res = await demoLoginAction("visitor@example.com")
    expect(res).toEqual({ ok: false, error: "not_demo" })
    expect(demoSignInMock).not.toHaveBeenCalled()
  })

  it("demoSetRoleAction is a no-op", async () => {
    const res = await demoSetRoleAction("admin")
    expect(res).toEqual({ ok: false, error: "not_demo" })
    expect(setDemoRoleMock).not.toHaveBeenCalled()
  })

  it("demoSetSubscriptionAction is a no-op", async () => {
    const res = await demoSetSubscriptionAction(true)
    expect(res).toEqual({ ok: false, error: "not_demo" })
    expect(setDemoSubscriptionActiveMock).not.toHaveBeenCalled()
  })

  it("demoResetAction is a no-op", async () => {
    const res = await demoResetAction()
    expect(res).toEqual({ ok: false, error: "not_demo" })
    expect(resetDemoSessionMock).not.toHaveBeenCalled()
  })
})

describe("demo-controls — active when demo mode is on", () => {
  beforeEach(() => {
    isDemoModeMock.mockReset()
    isDemoModeMock.mockReturnValue(true)
    demoSignInMock.mockReset()
    setDemoRoleMock.mockReset()
    setDemoSubscriptionActiveMock.mockReset()
    resetDemoSessionMock.mockReset()
  })

  it("demoLoginAction signs in with any email", async () => {
    const res = await demoLoginAction("visitor@example.com")
    expect(res).toEqual({ ok: true })
    expect(demoSignInMock).toHaveBeenCalledWith("visitor@example.com")
  })

  it("demoSetRoleAction switches the role", async () => {
    const res = await demoSetRoleAction("admin")
    expect(res).toEqual({ ok: true })
    expect(setDemoRoleMock).toHaveBeenCalledWith("admin")
  })

  it("demoSetSubscriptionAction flips the gate", async () => {
    const res = await demoSetSubscriptionAction(false)
    expect(res).toEqual({ ok: true })
    expect(setDemoSubscriptionActiveMock).toHaveBeenCalledWith(false)
  })

  it("demoResetAction resets the session", async () => {
    const res = await demoResetAction()
    expect(res).toEqual({ ok: true })
    expect(resetDemoSessionMock).toHaveBeenCalledOnce()
  })
})
