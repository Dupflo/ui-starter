import { describe, it, expect } from "vitest"
import { loginSchema, signupSchema } from "./schemas"

// Auth schema tests — AC1 (signup input rejection) + AC2 (login input rejection).
// Error messages are i18n keys (contract with the `auth` namespace), NOT localised text.

describe("loginSchema", () => {
  it("passes with valid email and non-empty password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "anypassword",
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty password with authErrorRequired key", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("authErrorRequired")
    }
  })

  it("rejects bad email with authErrorEmail key", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "somepassword",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("authErrorEmail")
    }
  })
})

describe("signupSchema", () => {
  it("passes with valid name, email and password ≥ 8 chars", () => {
    const result = signupSchema.safeParse({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "12345678",
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing name with authErrorRequired key", () => {
    const result = signupSchema.safeParse({
      name: "",
      email: "ada@example.com",
      password: "12345678",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const nameIssue = result.error.issues.find((i) => i.path[0] === "name")
      expect(nameIssue?.message).toBe("authErrorRequired")
    }
  })

  it("rejects password shorter than 8 chars with authErrorPassword key", () => {
    const result = signupSchema.safeParse({
      name: "Ada",
      email: "ada@example.com",
      password: "short",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const passIssue = result.error.issues.find(
        (i) => i.path[0] === "password",
      )
      expect(passIssue?.message).toBe("authErrorPassword")
    }
  })

  it("rejects bad email with authErrorEmail key", () => {
    const result = signupSchema.safeParse({
      name: "Ada",
      email: "not-an-email",
      password: "12345678",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const emailIssue = result.error.issues.find((i) => i.path[0] === "email")
      expect(emailIssue?.message).toBe("authErrorEmail")
    }
  })
})
