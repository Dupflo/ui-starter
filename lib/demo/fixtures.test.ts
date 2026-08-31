import { describe, it, expect } from "vitest"
import {
  buildDemoUser,
  DEMO_USER_ID,
  DEMO_PROFILE,
  DEMO_SUBSCRIPTION,
} from "./fixtures"

// T2 (s11-demo-mode) — fixtures must satisfy the fields the real calling
// pages read: app/[locale]/(app)/layout.tsx and settings read `email` and
// `user_metadata` off the Supabase `User` object; admin/dashboard read the
// `profiles`/`subscriptions` row shape (typed against `Database`).

describe("buildDemoUser — satisfies the Supabase User fields the app reads", () => {
  const user = buildDemoUser("demo@example.com", "Alex Démo")

  it("has a stable id matching DEMO_USER_ID", () => {
    expect(user.id).toBe(DEMO_USER_ID)
  })

  it("has the fields required by Supabase's User type (id, aud, created_at, app_metadata, user_metadata)", () => {
    expect(user.id).toBeTypeOf("string")
    expect(user.aud).toBeTypeOf("string")
    expect(user.created_at).toBeTypeOf("string")
    expect(user.app_metadata).toBeTypeOf("object")
    expect(user.user_metadata).toBeTypeOf("object")
  })

  it("has email — read by app/[locale]/(app)/layout.tsx and settings", () => {
    expect(user.email).toBe("demo@example.com")
  })

  it("has user_metadata.full_name / .name — read by layout.tsx and settings for the display name fallback", () => {
    expect(user.user_metadata.full_name).toBe("Alex Démo")
    expect(user.user_metadata.name).toBe("Alex Démo")
  })

  it("has identities — read by changePassword to detect password-based accounts", () => {
    expect(Array.isArray(user.identities)).toBe(true)
  })
})

describe("DEMO_PROFILE — Database-typed profiles row", () => {
  it("id matches DEMO_USER_ID (profiles.id = auth.users.id)", () => {
    expect(DEMO_PROFILE.id).toBe(DEMO_USER_ID)
  })

  it("role is a valid profiles.role value", () => {
    expect(["user", "admin"]).toContain(DEMO_PROFILE.role)
  })
})

describe("DEMO_SUBSCRIPTION — Database-typed subscriptions row", () => {
  it("user_id matches DEMO_USER_ID", () => {
    expect(DEMO_SUBSCRIPTION.user_id).toBe(DEMO_USER_ID)
  })

  it("status is a non-empty string", () => {
    expect(DEMO_SUBSCRIPTION.status).toBeTypeOf("string")
    expect(DEMO_SUBSCRIPTION.status.length).toBeGreaterThan(0)
  })
})
