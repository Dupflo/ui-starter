import type { ReactNode } from "react"
import type { UseFormRegisterReturn } from "react-hook-form"
import { cn } from "@/lib/cn"

// Shared control styling so every input/textarea/select matches.
export const fieldBase =
  "w-full rounded-lg border bg-input px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:ring-[3px]"

export function fieldState(error?: boolean) {
  return error
    ? "border-danger focus:border-danger focus:ring-danger/10"
    : "border-line focus:border-pine focus:ring-pine/10"
}

/** Small muted label above a form control. */
export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1.5 block text-xs font-medium text-muted">
      {children}
    </span>
  )
}

/** Labelled text input wired to react-hook-form. */
export function TextField({
  label,
  registration,
  error,
  type = "text",
  placeholder,
  autoFocus = false,
}: {
  label: string
  registration: UseFormRegisterReturn
  error?: string
  type?: string
  placeholder?: string
  autoFocus?: boolean
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        placeholder={placeholder}
        autoFocus={autoFocus}
        {...registration}
        className={cn(fieldBase, fieldState(!!error))}
      />
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </label>
  )
}
