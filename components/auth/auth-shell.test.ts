import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { describe, it, expect } from "vitest"

// Source-level structural assertions for AuthShell (s08-i18n).
//
// WHY source-level: the repo uses environment: node (no jsdom). The established
// convention is source inspection (see page.test.ts, app-sidebar.test.ts).
//
// AC1 (auth surface): LocaleMenu is mounted on the pine canvas so a visitor
// can switch locale before logging in.
// AuthShell must stay a server component (no "use client") — LocaleMenu is
// the client island; the shell only renders it as a static child.

const authShellDir = fileURLToPath(new URL(".", import.meta.url))
const src = readFileSync(path.join(authShellDir, "auth-shell.tsx"), "utf8")

describe("auth-shell — s08-i18n: LocaleMenu mounted on the pine canvas", () => {
  it("imports LocaleMenu", () => {
    expect(
      src,
      'auth-shell.tsx must import LocaleMenu from "@/components/ui/locale-menu"',
    ).toMatch(
      /import\s*\{[^}]*\bLocaleMenu\b[^}]*\}\s*from\s*["']@\/components\/ui\/locale-menu["']/,
    )
  })

  it("renders <LocaleMenu /> in the JSX", () => {
    expect(
      src,
      "auth-shell.tsx must render <LocaleMenu /> so the switcher appears on the auth surface",
    ).toContain("<LocaleMenu")
  })

  it('stays a server component (no "use client" directive)', () => {
    expect(
      src,
      'auth-shell.tsx must NOT have "use client" — AuthShell is a server component; only the LocaleMenu child is a client island',
    ).not.toContain('"use client"')
  })
})
