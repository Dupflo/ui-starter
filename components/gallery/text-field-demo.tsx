"use client"

import { TextField } from "@/components/ui/text-field"
import { fakeRegistration } from "@/components/gallery/fake-registration"

/**
 * `TextField` spreads a react-hook-form-shaped `registration` object
 * (including a `ref` callback) onto its `<input>`. React refuses to create
 * a host element carrying a `ref` from a Server Component render pass
 * ("Refs cannot be used in Server Components") — reproduced with a real
 * `DEMO_MODE=1 next build` (see the story report). `TextField` itself has
 * no "use client" pragma (same as the real auth forms — it becomes client
 * code only because whatever imports it is client code); this wrapper is
 * that boundary for the gallery. Same documented-exception category as
 * `ModalDemo`/`LightboxDemo`.
 */
export function TextFieldDemo({
  label,
  type = "text",
  name,
  error,
}: {
  label: string
  type?: string
  name: string
  error?: string
}) {
  return (
    <TextField
      label={label}
      type={type}
      registration={fakeRegistration(name)}
      error={error}
    />
  )
}
