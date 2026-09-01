import type { ReactNode } from "react"
import { cn } from "@/lib/cn"

const selectBase =
  "w-full cursor-pointer rounded-lg border border-line bg-input py-2.5 pl-3 pr-9 text-sm text-ink outline-none transition-colors focus:border-pine focus:ring-[3px] focus:ring-pine/10 disabled:opacity-60"

export type SelectOption = { value: string; label: ReactNode }

/**
 * Styled native select. Spreads native props, so it works both controlled
 * (`value` + `onChange`) and with react-hook-form (`{...register(name)}`).
 * Pass `label` to wrap it in a labelled field.
 */
export function Select({
  label,
  options,
  className,
  ...props
}: {
  label?: string
  options: SelectOption[]
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const select = (
    <select {...props} className={cn(selectBase, className)}>
      {options.map((o) => (
        <option key={String(o.value)} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )

  if (!label) return select
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">
        {label}
      </span>
      {select}
    </label>
  )
}
