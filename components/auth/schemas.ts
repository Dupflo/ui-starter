import { z } from "zod"

// Auth form schemas. Error messages are i18n keys resolved via the `auth` namespace.
// Server-importable (a future Server Action can safeParse the same schema).

export const loginSchema = z.object({
  email: z.string().email("authErrorEmail"),
  password: z.string().min(1, "authErrorRequired"),
})
export type LoginValues = z.infer<typeof loginSchema>

export const signupSchema = z.object({
  name: z.string().min(1, "authErrorRequired"),
  email: z.string().email("authErrorEmail"),
  password: z.string().min(8, "authErrorPassword"),
})
export type SignupValues = z.infer<typeof signupSchema>
