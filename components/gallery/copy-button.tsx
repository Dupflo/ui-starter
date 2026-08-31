"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

/**
 * T3 (s12-ui-gallery) — the ONLY client component in the gallery
 * (`navigator.clipboard` requires it). Everything else, including the code
 * text it copies, is produced server-side by `codeOf()` and passed in as a
 * plain string prop.
 */
export function CopyButton({
  code,
  labels,
}: {
  code: string
  labels: { copy: string; copied: string }
}) {
  const [copied, setCopied] = useState(false)

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API unavailable (permissions, insecure context) — non-critical, ignore.
    }
  }

  return (
    <Button type="button" variant="subtle" size="sm" onClick={onClick}>
      {copied ? labels.copied : labels.copy}
    </Button>
  )
}
